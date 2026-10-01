"""Server-only configuration. Never include values in validation errors."""
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit
import os

from dotenv import load_dotenv
from email_validator import EmailNotValidError, validate_email


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    smtp_host: str
    smtp_port: int
    smtp_username: str = field(repr=False)
    smtp_password: str = field(repr=False)
    smtp_from_email: str
    otp_secret: str = field(repr=False)
    frontend_url: str
    smtp_from_name: str = "Pivot Sols"
    contact_to_email: str = ""
    email_provider: str = "smtp"
    brevo_api_key: str = field(default="", repr=False)

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).with_name(".env"), override=False)
        provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()
        if provider not in {"smtp", "brevo"}:
            raise ConfigurationError("EMAIL_PROVIDER must be smtp or brevo.")
        required = ("SMTP_FROM_EMAIL", "OTP_SECRET", "FRONTEND_URL") + (
            ("SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD") if provider == "smtp" else ("BREVO_API_KEY",))
        missing = [key for key in required if not os.environ.get(key, "").strip()]
        if missing:
            raise ConfigurationError("Missing backend configuration: " + ", ".join(missing) + ". Fill backend/.env.")
        values = {key: os.environ[key].strip() for key in required}
        for key, default in (("SMTP_HOST", "smtp.gmail.com"), ("SMTP_PORT", "587"), ("SMTP_USERNAME", "")):
            values.setdefault(key, os.getenv(key, default).strip())
        try:
            port = int(values["SMTP_PORT"])
            if not 1 <= port <= 65535:
                raise ValueError
        except ValueError:
            raise ConfigurationError("SMTP_PORT must be an integer between 1 and 65535.") from None
        try:
            sender = validate_email(values["SMTP_FROM_EMAIL"], check_deliverability=False).normalized
        except EmailNotValidError:
            raise ConfigurationError("SMTP_FROM_EMAIL must be a valid email address.") from None
        secret = values["OTP_SECRET"]
        if len(secret) < 32 or secret in {"replace-with-long-random-secret", "GENERATE_A_LONG_RANDOM_SECRET"}:
            raise ConfigurationError("OTP_SECRET must be a locally generated random secret of at least 32 characters.")
        origin = values["FRONTEND_URL"].rstrip("/")
        try:
            parsed = urlsplit(origin)
            _ = parsed.port  # Access validates any explicitly supplied port.
            if (parsed.scheme not in {"http", "https"} or not parsed.hostname or "*" in origin
                    or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment):
                raise ValueError
        except ValueError:
            raise ConfigurationError("FRONTEND_URL must be one explicit http(s) origin without a path or wildcard.") from None
        name = os.getenv("SMTP_FROM_NAME", "Pivot Sols").strip() or "Pivot Sols"
        if any(char in values["SMTP_HOST"] + name for char in "\r\n"):
            raise ConfigurationError("SMTP_HOST and SMTP_FROM_NAME must not contain line breaks.")
        return cls(values["SMTP_HOST"], port, values["SMTP_USERNAME"], os.getenv("SMTP_PASSWORD", ""),
                   sender, secret, origin, name, os.getenv("CONTACT_TO_EMAIL", "").strip(),
                   provider, os.getenv("BREVO_API_KEY", "").strip())
