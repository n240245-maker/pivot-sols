"""Server-only email transport; credentials, messages and codes are never logged."""
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from html import escape
from datetime import datetime, timezone
import smtplib
import ssl
import httpx
from email_validator import validate_email

from config import Settings
from contact_models import ContactRequest


def send_otp_email(recipient_email: str, otp: str, *, settings: Settings | None = None) -> None:
    config = settings or Settings.from_env()
    message = EmailMessage()
    message["Subject"] = "Your Pivot Sols verification code"
    message["From"] = formataddr((config.smtp_from_name, config.smtp_from_email))
    message["To"] = recipient_email
    message.set_content(
        f"Pivot Sols\n\nYour verification code is:\n\n{otp}\n\n"
        "This code expires in 5 minutes.\n\n"
        "If you did not request this code, you can ignore this email.\n\n"
        "— Pivot Sols\nRGUKT Nuzvid Student Platform\n"
    )
    message.add_alternative(
        '<html><body style="margin:0;background:#f5f5fa;font-family:Arial,sans-serif;color:#242333">'
        '<main style="max-width:480px;margin:32px auto;padding:32px;background:white;border-radius:16px">'
        '<h1 style="font-size:22px">Pivot Sols</h1><p>Your verification code is:</p>'
        f'<p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#5145a0">{escape(otp)}</p>'
        '<p>This code expires in 5 minutes.</p>'
        '<p>If you did not request this code, you can ignore this email.</p>'
        '<p>— Pivot Sols<br>RGUKT Nuzvid Student Platform</p></main></body></html>', subtype="html"
    )
    send_email(message, config)


def send_email(message: EmailMessage, config: Settings) -> None:
    """Keep local SMTP; use HTTPS delivery on hosts that block SMTP ports."""
    if config.email_provider == "brevo":
        send_brevo_email(message, config)
        return
    with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=12) as server:
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        server.login(config.smtp_username, config.smtp_password)
        server.send_message(message)


def send_brevo_email(message: EmailMessage, config: Settings) -> None:
    payload = {
        "sender": {"name": config.smtp_from_name, "email": config.smtp_from_email},
        "to": [{"email": parseaddr(str(message["To"]))[1]}],
        "subject": str(message["Subject"]),
    }
    for subtype, key in (("plain", "textContent"), ("html", "htmlContent")):
        part = message.get_body(preferencelist=(subtype,))
        if part:
            payload[key] = part.get_content()
    if message["Reply-To"]:
        payload["replyTo"] = {"email": parseaddr(str(message["Reply-To"]))[1]}
    try:
        response = httpx.post("https://api.brevo.com/v3/smtp/email",
            headers={"api-key": config.brevo_api_key, "accept": "application/json"},
            json=payload, timeout=12, follow_redirects=False)
        if response.status_code != 201 or not response.json().get("messageId"):
            raise ValueError
    except Exception:
        # Provider responses may include the submitted OTP or API credential.
        raise RuntimeError("Email delivery could not be confirmed. Please try again.") from None


def send_contact_email(body: ContactRequest, *, settings: Settings) -> None:
    # Validate only for contact delivery: missing contact setup must not stop OTP.
    recipient = validate_email(settings.contact_to_email, check_deliverability=False).normalized
    message = EmailMessage()
    message["Subject"] = f"Pivot Sols Contact — {body.name}"
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email))
    message["To"] = recipient
    message["Reply-To"] = str(body.email)
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    message.set_content(f"Pivot Sols contact message\n\nName: {body.name}\n"
                        f"Student email (supplied by sender): {body.email}\nTimestamp (UTC): {timestamp}\n\n"
                        f"Message:\n{body.message}\n")
    send_email(message, settings)
