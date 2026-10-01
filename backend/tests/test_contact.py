from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
import ssl

import pytest
from fastapi.testclient import TestClient

from app import create_app
from contact_models import ContactRequest
from contact_service import ContactError, ContactService
from email_service import send_contact_email
from conftest import Clock


BODY = {"name": "Student", "email": "student@example.com", "message": "Please add more reviewed experiment guides."}


def contact_client(settings, setup, sender, clock=None):
    service = ContactService(sender, clock=clock or Clock())
    return TestClient(create_app(settings, otp_service=setup[0], contact_service=service))


def test_valid_contact_delivers_normalized_fields_and_returns_success(settings, setup):
    sent = []
    with contact_client(settings, setup, sent.append) as client:
        response = client.post("/api/contact", json={**BODY, "name": " Student ", "email": " STUDENT@example.com "})
    assert response.status_code == 200
    assert response.json() == {"success": True, "message": "Message sent successfully."}
    assert sent[0].name == "Student" and str(sent[0].email) == "student@example.com"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("field,value", [("name", " "), ("name", "A"), ("name", "x" * 101),
                                         ("name", "A\nBcc: bad@example.com"), ("email", "invalid"),
                                         ("email", "a@example.com\nBcc: bad@example.com"),
                                         ("message", ""), ("message", "too short"), ("message", "x" * 3001),
                                         ("message", "bad\x00message text")])
def test_invalid_contact_never_sends_or_echoes_input(settings, setup, field, value):
    sent = []
    with contact_client(settings, setup, sent.append) as client:
        response = client.post("/api/contact", json={**BODY, field: value})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_request"
    assert "input" not in response.json()
    assert sent == []


def test_contact_rejects_extra_recipient_field(settings, setup):
    sent = []
    with contact_client(settings, setup, sent.append) as client:
        assert client.post("/api/contact", json={**BODY, "to": "arbitrary@example.com"}).status_code == 400
    assert not sent


def test_smtp_failure_is_generic_and_does_not_report_success(settings, setup):
    def fail(_body):
        raise RuntimeError("private credentials or SMTP details")
    with contact_client(settings, setup, fail) as client:
        response = client.post("/api/contact", json=BODY)
    assert response.status_code == 503
    assert response.json() == {"success": False, "code": "delivery_failed", "message": "We couldn't send your message. Please try again."}
    assert "private" not in response.text


def test_rate_limit_expires_and_is_independent_of_otp(settings, setup):
    sent, clock = [], Clock()
    with contact_client(settings, setup, sent.append, clock) as client:
        for _ in range(5):
            assert client.post("/api/contact", json=BODY).status_code == 200
        limited = client.post("/api/contact", json=BODY)
        assert limited.status_code == 429
        assert limited.headers["retry-after"] == "900"
        assert limited.json()["retry_after"] == 900
        # A spoofed forwarding header does not reset the socket-IP limit.
        assert client.post("/api/contact", json={**BODY, "email": "another@example.com"}, headers={"X-Forwarded-For": "1.2.3.4"}).status_code == 429
        assert client.post("/api/auth/send-otp", json={"email": BODY["email"]}).status_code == 200
        code = setup[2][-1][1]
        assert client.post("/api/auth/verify-otp", json={"email": BODY["email"], "otp": code}).json()["verified"] is True
        clock.advance(900)
        assert client.post("/api/contact", json=BODY).status_code == 200
    assert len(sent) == 6


def test_email_limit_survives_ip_changes_and_failed_delivery_counts():
    sent = []
    service = ContactService(sent.append)
    body = ContactRequest(**BODY)
    for index in range(5):
        service.send(body, f"ip-{index}")
    with pytest.raises(ContactError) as error:
        service.send(body, "new-ip")
    assert error.value.status == 429
    failures = ContactService(lambda _: (_ for _ in ()).throw(RuntimeError("SMTP failure")))
    for _ in range(5):
        with pytest.raises(ContactError) as failure:
            failures.send(body, "ip")
        assert failure.value.status == 503
    with pytest.raises(ContactError) as failure:
        failures.send(body, "ip")
    assert failure.value.status == 429


def test_concurrent_requests_cannot_bypass_contact_limit():
    sent = []
    service = ContactService(sent.append)
    def submit(_):
        try:
            service.send(ContactRequest(**BODY), "ip")
            return 200
        except ContactError as error:
            return error.status
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(submit, range(12)))
    assert results.count(200) == 5 and results.count(429) == 7
    assert len(sent) == 5


def test_global_limit_caps_many_distinct_senders():
    service = ContactService(lambda _: None)
    for index in range(60):
        service.send(ContactRequest(**{**BODY, "email": f"student{index}@example.com"}), f"ip-{index}")
    with pytest.raises(ContactError) as error:
        service.send(ContactRequest(**BODY), "other-ip")
    assert error.value.status == 429


@pytest.mark.parametrize("recipient", ["", "invalid", "a@example.com\nBcc: other@example.com"])
def test_missing_or_invalid_contact_destination_never_connects_smtp(settings, setup, monkeypatch, recipient):
    monkeypatch.setattr("email_service.smtplib.SMTP", lambda *_args, **_kwargs: pytest.fail("Must not connect"))
    with TestClient(create_app(replace(settings, contact_to_email=recipient), otp_service=setup[0])) as client:
        assert client.post("/api/contact", json=BODY).status_code == 503
        assert client.post("/api/auth/send-otp", json={"email": BODY["email"]}).status_code == 200


def test_contact_smtp_reuses_starttls_and_sends_only_to_configured_inbox(settings, monkeypatch):
    messages, calls = [], []
    class FakeSMTP:
        def __init__(self, host, port, timeout):
            assert host == settings.smtp_host and port == settings.smtp_port and timeout == 12
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def ehlo(self): calls.append("ehlo")
        def starttls(self, context):
            assert context.verify_mode == ssl.CERT_REQUIRED and context.check_hostname
            calls.append("tls")
        def login(self, *_): calls.append("login")
        def send_message(self, message): messages.append(message)
    monkeypatch.setattr("email_service.smtplib.SMTP", FakeSMTP)
    send_contact_email(ContactRequest(**BODY), settings=replace(settings, contact_to_email="inbox@example.com"))
    message = messages[0]
    assert message["To"] == "inbox@example.com"
    assert message["Reply-To"] == BODY["email"]
    assert message["Subject"] == "Pivot Sols Contact — Student"
    assert settings.smtp_from_email in message["From"]
    for text in [BODY["name"], BODY["email"], BODY["message"], "Timestamp (UTC)"]:
        assert text in message.get_content()
    assert calls == ["ehlo", "tls", "ehlo", "login"]
