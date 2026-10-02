"""Revocable, opaque 30-day student sessions backed by PostgreSQL."""
from datetime import timedelta
from hashlib import sha256
import hmac
import secrets
from urllib.parse import urlsplit

from fastapi import Request, Response
from sqlalchemy import select

from cms.models import StudentSession, utcnow

COOKIE = 'pivot_student_session'
LIFETIME_SECONDS = 30 * 24 * 60 * 60


def identifier(secret: str, student_id: str) -> str:
    return hmac.new(secret.encode(), f'student-id:{student_id.strip().upper()}'.encode(), sha256).hexdigest()


def token_hash(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def cookie_options(frontend_url: str) -> dict:
    secure = urlsplit(frontend_url).hostname not in {'localhost', '127.0.0.1', '::1'}
    # Hosted requests use the same-origin /api proxy. Localhost is same-site across ports.
    return {'httponly': True, 'secure': secure, 'samesite': 'lax', 'path': '/'}


def issue(response: Response, db, profile: dict, frontend_url: str) -> StudentSession:
    now = utcnow()
    token = secrets.token_urlsafe(32)
    row = StudentSession(student_email=None, student_name=profile['name'],
                         student_id=profile['student_id'], academic_level=profile['academic_level'],
                         token_hash=token_hash(token), created_at=now, last_used_at=now,
                         expires_at=now + timedelta(seconds=LIFETIME_SECONDS))
    db.add(row)
    db.commit()
    db.refresh(row)
    response.set_cookie(COOKIE, token, max_age=LIFETIME_SECONDS, **cookie_options(frontend_url))
    return row


def current(request: Request, db) -> StudentSession | None:
    token = request.cookies.get(COOKIE, '')
    if not 40 <= len(token) <= 100:
        return None
    row = db.scalar(select(StudentSession).where(StudentSession.token_hash == token_hash(token)))
    now = utcnow()
    if row is None or row.revoked_at is not None or row.expires_at <= now:
        return None
    row.last_used_at = now
    return row


def public_profile(row: StudentSession, secret: str) -> dict | None:
    if not row.student_name or not row.student_id or row.academic_level not in {'P1', 'E1'}:
        return None
    return {'id': identifier(secret, row.student_id), 'name': row.student_name,
            'studentId': row.student_id,
            'academicLevel': row.academic_level, 'batch': 0, 'campus': 'Nuzvid'}


def revoke(request: Request, response: Response, db, frontend_url: str) -> None:
    row = current(request, db)
    if row is not None:
        row.revoked_at = utcnow()
        db.commit()
    response.delete_cookie(COOKIE, **cookie_options(frontend_url))
