"""Short-lived, server-verifiable student identity issued only after OTP verification."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
from urllib.parse import urlsplit

from fastapi import Request, Response

COOKIE = 'pivot_student_session'


def identifier(secret: str, email: str) -> str:
    return hmac.new(secret.encode(), f'student:{email.lower()}'.encode(), sha256).hexdigest()


def issue(response: Response, secret: str, email: str, frontend_url: str) -> None:
    identity = identifier(secret, email)
    expiry = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())
    content = f'{identity}.{expiry}'
    signature = hmac.new(secret.encode(), f'session:{content}'.encode(), sha256).hexdigest()
    secure = urlsplit(frontend_url).hostname not in {'localhost', '127.0.0.1', '::1'}
    response.set_cookie(COOKIE, f'{content}.{signature}', max_age=7 * 86400, httponly=True,
                        secure=secure, samesite='none' if secure else 'strict', path='/api')


def current(request: Request, secret: str) -> str | None:
    parts = request.cookies.get(COOKIE, '').split('.')
    if len(parts) != 3 or len(parts[0]) != 64 or len(parts[2]) != 64:
        return None
    identity, expiry_text, signature = parts
    try:
        expiry = int(expiry_text)
    except ValueError:
        return None
    if expiry <= int(datetime.now(timezone.utc).timestamp()):
        return None
    expected = hmac.new(secret.encode(), f'session:{identity}.{expiry}'.encode(), sha256).hexdigest()
    return identity if hmac.compare_digest(signature, expected) else None


def clear(response: Response, frontend_url: str) -> None:
    secure = urlsplit(frontend_url).hostname not in {'localhost', '127.0.0.1', '::1'}
    response.delete_cookie(COOKIE, path='/api', secure=secure, httponly=True,
                           samesite='none' if secure else 'strict')
