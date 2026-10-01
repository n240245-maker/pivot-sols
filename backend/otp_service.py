"""Single-process prototype store. SMTP runs outside the store lock."""
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
import hashlib
import hmac
import logging
import math
import secrets
import threading
import time

logger = logging.getLogger("pivot_sols.auth")
OTP_LIFETIME = 300
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = 60
SEND_WINDOW = 900
MAX_SENDS = 5


class OtpError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, retry_after: int | None = None):
        super().__init__(message)
        self.code, self.message, self.status, self.retry_after = code, message, status, retry_after


@dataclass
class OtpRecord:
    otp_hash: str = field(repr=False)
    expires_at: float
    attempts: int = 0


@dataclass
class SendHistory:
    # Kept independently so verification/expiry cannot reset sending limits.
    timestamps: deque[float] = field(default_factory=deque)
    last_sent_at: float | None = None
    sending: bool = False


class OtpService:
    def __init__(self, secret: str, sender: Callable[[str, str], None], *, clock: Callable[[], float] = time.monotonic):
        self._secret = secret
        self._sender = sender
        self._clock = clock
        self._lock = threading.Lock()
        self._records: dict[str, OtpRecord] = {}
        self._history: dict[str, SendHistory] = {}

    def _hash(self, email: str, otp: str) -> str:
        return hmac.new(self._secret.encode(), f"{email}:{otp}".encode(), hashlib.sha256).hexdigest()

    def _cleanup(self, now: float) -> None:
        for email in list(self._records):
            if self._records[email].expires_at <= now:
                del self._records[email]
        for email, history in list(self._history.items()):
            while history.timestamps and history.timestamps[0] <= now - SEND_WINDOW:
                history.timestamps.popleft()
            if not history.timestamps and not history.sending:
                del self._history[email]

    def send(self, email: str) -> None:
        email = email.strip().lower()
        with self._lock:
            now = self._clock()
            self._cleanup(now)
            history = self._history.setdefault(email, SendHistory())
            if len(history.timestamps) >= MAX_SENDS:
                logger.info("OTP request rate-limited")
                raise OtpError("rate_limited", "Too many OTP requests. Please try again later.", 429,
                               max(1, math.ceil(history.timestamps[0] + SEND_WINDOW - now)))
            remaining = RESEND_COOLDOWN if history.sending else (
                math.ceil(history.last_sent_at + RESEND_COOLDOWN - now) if history.last_sent_at is not None else 0)
            if remaining > 0:
                raise OtpError("resend_cooldown", "Please wait before requesting another OTP.", 429, remaining)
            # Reserve under the lock; concurrent requests cannot send duplicate emails.
            history.timestamps.append(now)
            history.sending = True
            previous = self._records.pop(email, None)
            otp = f"{secrets.randbelow(1_000_000):06d}"
            digest = self._hash(email, otp)
            while previous and hmac.compare_digest(previous.otp_hash, digest):
                otp = f"{secrets.randbelow(1_000_000):06d}"
                digest = self._hash(email, otp)
        logger.info("OTP send requested")
        try:
            self._sender(email, otp)
        except Exception:
            # No exception text/traceback: SMTP errors may contain credentials or message data.
            with self._lock:
                history.sending = False
                self._records.pop(email, None)
            logger.error("SMTP delivery failed")
            raise OtpError("delivery_failed", "We couldn't send your verification code. Please try again.", 503) from None
        finally:
            otp = ""  # Raw code is transient transport input, never stored in the service.
        with self._lock:
            sent_at = self._clock()
            history.last_sent_at = sent_at
            history.sending = False
            self._records[email] = OtpRecord(digest, sent_at + OTP_LIFETIME)
        logger.info("OTP email sent")

    def verify(self, email: str, otp: str) -> None:
        email = email.strip().lower()
        with self._lock:
            now = self._clock()
            record = self._records.get(email)
            expired = record is not None and record.expires_at <= now
            self._cleanup(now)
            if expired:
                raise OtpError("expired_otp", "This verification code has expired. Request a new one.")
            record = self._records.get(email)
            if record is None:
                raise OtpError("invalid_otp", "The verification code is incorrect.")
            if not hmac.compare_digest(record.otp_hash, self._hash(email, otp)):
                record.attempts += 1
                logger.info("OTP verification failed")
                if record.attempts >= MAX_ATTEMPTS:
                    del self._records[email]
                    raise OtpError("attempts_exceeded", "Too many incorrect attempts. Request a new OTP.")
                raise OtpError("invalid_otp", "The verification code is incorrect.")
            del self._records[email]
        logger.info("OTP verification succeeded")
