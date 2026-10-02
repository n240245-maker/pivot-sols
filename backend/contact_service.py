"""Small, bounded contact-delivery limiter."""
from collections import deque
from hashlib import sha256
from math import ceil
from threading import Lock
from time import monotonic
from typing import Callable

from contact_models import ContactRequest


class ContactError(Exception):
    def __init__(self, code: str, status: int, retry_after: int | None = None):
        self.code, self.status, self.retry_after = code, status, retry_after
        self.message = ("Too many messages. Please try again later." if code == "rate_limited"
                        else "We couldn't send your message. Please try again.")
        super().__init__(self.message)


class ContactService:
    def __init__(self, sender: Callable[[ContactRequest], None], *, clock: Callable[[], float] = monotonic):
        self._sender, self._clock = sender, clock
        self._attempts: dict[str, deque[float]] = {}
        self._global: deque[float] = deque()
        self._lock = Lock()

    def send(self, body: ContactRequest, client_ip: str) -> None:
        now = self._clock()
        keys = ["ip:" + sha256(client_ip.encode()).hexdigest(),
                "email:" + sha256(str(body.email).lower().encode()).hexdigest()]
        with self._lock:
            for key in list(self._attempts):
                times = self._attempts[key]
                while times and times[0] <= now - 900:
                    times.popleft()
                if not times:
                    del self._attempts[key]
            while self._global and self._global[0] <= now - 60:
                self._global.popleft()
            waits = [ceil(self._attempts[key][0] + 900 - now) for key in keys
                     if len(self._attempts.get(key, ())) >= 5]
            if len(self._global) >= 60:
                waits.append(ceil(self._global[0] + 60 - now))
            if len(self._attempts) + sum(key not in self._attempts for key in keys) > 2048:
                waits.append(900)
            if waits:
                raise ContactError("rate_limited", 429, max(1, max(waits)))
            for key in keys:
                self._attempts.setdefault(key, deque()).append(now)
            self._global.append(now)
        # SMTP runs outside the lock. Failed delivery attempts also count.
        try:
            self._sender(body)
        except Exception:
            raise ContactError("delivery_failed", 503) from None
