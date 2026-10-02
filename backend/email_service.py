"""Server-only Contact email transport; credentials and messages are never logged."""
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from datetime import datetime, timezone
import smtplib
import ssl
import httpx
from email_validator import validate_email

from config import Settings
from contact_models import ContactRequest


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
        # Provider responses may include the submitted message or API credential.
        raise RuntimeError("Email delivery could not be confirmed. Please try again.") from None


def send_contact_email(body: ContactRequest, *, settings: Settings) -> None:
    # Validate the recipient when Contact delivery is requested.
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
