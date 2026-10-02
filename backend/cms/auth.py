"""Independent database-backed admin password and revocable sessions."""
from datetime import timedelta
from hashlib import sha256
import hmac
import secrets
from urllib.parse import urlsplit

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Depends, Request, Response
from pydantic import EmailStr, Field, SecretStr, field_validator
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from .models import Admin, AdminSession, AdminThrottle, utcnow
from .repository import fail
from .schemas import Input

PASSWORDS = PasswordHasher()
_DUMMY_HASH = PASSWORDS.hash(secrets.token_urlsafe(32))
COOKIE = 'pivot_admin_session'


def hash_password(password):
    if not 12 <= len(password) <= 128:
        raise ValueError('Use a password of 12–128 characters.')
    return PASSWORDS.hash(password)


def password_matches(encoded, password):
    try:
        return PASSWORDS.verify(encoded or _DUMMY_HASH, password)
    except (VerificationError, InvalidHashError):
        return False


def digest(value):
    return sha256(value.encode()).hexdigest()


class LoginInput(Input):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize(cls, value):
        return value.lower()


class AdminSecurity:
    def __init__(self, settings, *, clock=utcnow):
        self.settings, self.clock = settings, clock
        self.secure_cookie = urlsplit(settings.frontend_url).hostname not in {'localhost', '127.0.0.1', '::1'}

    @property
    def cookie_samesite(self):
        # Vercel and Railway are different sites. Exact Origin + CSRF checks
        # still protect writes; localhost keeps its stricter development cookie.
        return 'none' if self.secure_cookie else 'strict'

    def sign(self, purpose, value):
        return hmac.new(self.settings.otp_secret.encode(), f'admin:{purpose}:{value}'.encode(), sha256).hexdigest()

    def check_origin(self, request):
        if request.headers.get('origin') != self.settings.frontend_url or request.headers.get('x-pivot-admin') != '1':
            fail('This agent request is not allowed.', 403)

    def throttle(self, db, scope, identity, maximum, window=900):
        now = self.clock()
        key = self.sign('throttle', f'{scope}:{identity}')
        db.execute(insert(AdminThrottle).values(key=key, window_start=now, attempts=0).on_conflict_do_nothing())
        record = db.scalar(select(AdminThrottle).where(AdminThrottle.key == key).with_for_update())
        if record.window_start + timedelta(seconds=window) <= now:
            record.window_start, record.attempts = now, 0
        if record.attempts >= maximum:
            db.commit()
            fail('Too many agent sign-in attempts. Please try again later.', 429)
        record.attempts += 1
        db.commit()  # Failed passwords/delivery must also consume the allowance.

    def session(self, request, db):
        token = request.cookies.get(COOKIE, '')
        if not 40 <= len(token) <= 100:
            fail('Sign in as an agent to continue.', 401)
        session = db.scalar(select(AdminSession).where(AdminSession.token_hash == digest(token)).with_for_update())
        now = self.clock()
        if not session or session.revoked_at or session.expires_at <= now or session.last_used_at + timedelta(minutes=30) <= now:
            fail('Your agent session has ended. Sign in again.', 401)
        admin = db.get(Admin, session.admin_id)
        if not admin or not admin.is_active:
            fail('This agent account is unavailable.', 403)
        if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
            self.check_origin(request)
            if not hmac.compare_digest(request.headers.get('x-csrf-token', ''), self.sign('csrf', token)):
                fail('Refresh the agent page before trying again.', 403)
        session.last_used_at = now
        db.commit()
        return admin, session, self.sign('csrf', token)

def admin_auth_router(get_db, security):
    router = APIRouter(prefix='/api/admin/auth', tags=['Admin authentication'])

    @router.post('/login')
    def login(body: LoginInput, request: Request, response: Response, db=Depends(get_db)):
        security.check_origin(request)
        ip = request.client.host if request.client else 'unknown'
        security.throttle(db, 'login-ip', ip, 20)
        security.throttle(db, 'login-email', str(body.email), 8)
        admin = db.scalar(select(Admin).where(Admin.email == str(body.email)))
        valid = password_matches(admin.password_hash if admin else None, body.password.get_secret_value())
        if not admin or not valid or not admin.is_active:
            fail('Email or password is incorrect.', 401)
        # Lock the account before issuing a session; existing password hashes remain valid.
        admin = db.scalar(select(Admin).where(Admin.id == admin.id).with_for_update())
        now = security.clock()
        token = secrets.token_urlsafe(32)
        session = AdminSession(admin_id=admin.id, token_hash=digest(token), created_at=now, last_used_at=now,
                               expires_at=now + timedelta(hours=8))
        db.add(session)
        admin.last_login_at = now
        db.commit()
        response.set_cookie(COOKIE, token, max_age=28800, httponly=True, secure=security.secure_cookie,
                            samesite=security.cookie_samesite, path='/api/admin')
        return {'admin': {'email': admin.email, 'display_name': admin.display_name}, 'csrf_token': security.sign('csrf', token)}

    @router.get('/me')
    def me(request: Request, db=Depends(get_db)):
        admin, _, csrf = security.session(request, db)
        return {'admin': {'email': admin.email, 'display_name': admin.display_name}, 'csrf_token': csrf}

    @router.post('/logout')
    def logout(request: Request, response: Response, db=Depends(get_db)):
        _, session, _ = security.session(request, db)
        session.revoked_at = security.clock()
        db.commit()
        response.delete_cookie(COOKIE, path='/api/admin', secure=security.secure_cookie, httponly=True, samesite=security.cookie_samesite)
        return {'success': True}

    return router
