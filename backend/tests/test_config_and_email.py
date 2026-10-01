import ssl
from dataclasses import replace

import pytest

from config import ConfigurationError, Settings
from email_service import send_otp_email


@pytest.fixture
def configured_env(monkeypatch):
    monkeypatch.setattr("config.load_dotenv", lambda *_args, **_kwargs: None)
    monkeypatch.setenv('EMAIL_PROVIDER', 'smtp')
    values = {"SMTP_HOST": "smtp.gmail.com", "SMTP_PORT": "587", "SMTP_USERNAME": "owner@example.com",
              "SMTP_PASSWORD": "test-app-password", "SMTP_FROM_EMAIL": "owner@example.com",
              "OTP_SECRET": "test-only-secret-" * 4, "FRONTEND_URL": "http://localhost:5173"}
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    return values


@pytest.mark.parametrize("key", ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL", "OTP_SECRET", "FRONTEND_URL"])
def test_missing_configuration_fails_clearly_without_values(configured_env, monkeypatch, key):
    monkeypatch.delenv(key)
    with pytest.raises(ConfigurationError) as error:
        Settings.from_env()
    assert key in str(error.value)
    assert "test-app-password" not in str(error.value)


@pytest.mark.parametrize("key,value", [("OTP_SECRET", "replace-with-long-random-secret"), ("SMTP_PORT", "bad"),
                                      ("SMTP_PORT", "65536"), ("SMTP_FROM_EMAIL", "bad"),
                                      ("FRONTEND_URL", "*"), ("FRONTEND_URL", "http://localhost:5173/path")])
def test_invalid_configuration_is_rejected(configured_env, monkeypatch, key, value):
    monkeypatch.setenv(key, value)
    with pytest.raises(ConfigurationError):
        Settings.from_env()


def test_config_secrets_are_not_in_repr(configured_env):
    config = Settings.from_env()
    assert config.smtp_port == 587
    for key in ["OTP_SECRET", "SMTP_PASSWORD"]:
        assert configured_env[key] not in repr(config)


def test_smtp_uses_timeout_starttls_validation_and_both_templates(settings, monkeypatch):
    calls, messages = [], []
    class FakeSMTP:
        def __init__(self, host, port, timeout): calls.append(("connect", host, port, timeout))
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def ehlo(self): calls.append(("ehlo",))
        def starttls(self, context):
            assert context.verify_mode == ssl.CERT_REQUIRED
            assert context.check_hostname is True
            calls.append(("starttls",))
        def login(self, username, password): calls.append(("login", username, password))
        def send_message(self, message): messages.append(message); calls.append(("send",))
    monkeypatch.setattr("email_service.smtplib.SMTP", FakeSMTP)
    send_otp_email("student@example.com", "483912", settings=settings)
    assert [call[0] for call in calls] == ["connect", "ehlo", "starttls", "ehlo", "login", "send"]
    assert calls[0][-1] == 12
    message = messages[0]
    assert message["Subject"] == "Your Pivot Sols verification code"
    assert message["From"].startswith("Pivot Sols")
    assert message["To"] == "student@example.com"
    assert "483912" in message.get_body(preferencelist=("plain",)).get_content()
    assert "483912" in message.get_body(preferencelist=("html",)).get_content()


def test_brevo_configuration_does_not_require_smtp_credentials(configured_env, monkeypatch):
    monkeypatch.setenv('EMAIL_PROVIDER', 'brevo')
    monkeypatch.setenv('BREVO_API_KEY', 'test-only-provider-key')
    for key in ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD'):
        monkeypatch.delenv(key)
    config = Settings.from_env()
    assert config.email_provider == 'brevo'
    assert config.smtp_password == ''
    assert 'test-only-provider-key' not in repr(config)
    monkeypatch.delenv('BREVO_API_KEY')
    with pytest.raises(ConfigurationError, match='BREVO_API_KEY'):
        Settings.from_env()


def test_brevo_sends_otp_and_contact_with_safe_reply_to(settings, monkeypatch):
    from email_service import send_contact_email
    from contact_models import ContactRequest
    from types import SimpleNamespace
    requests = []
    def post(url, **kwargs):
        requests.append((url, kwargs))
        return SimpleNamespace(status_code=201, json=lambda: {'messageId': 'test-message'})
    monkeypatch.setattr('email_service.httpx.post', post)
    monkeypatch.setattr('email_service.smtplib.SMTP', lambda *_a, **_k: pytest.fail('HTTPS email must not use SMTP'))
    config = replace(settings, email_provider='brevo', brevo_api_key='test-only-key', contact_to_email='inbox@example.com')
    send_otp_email('student@example.com', '483912', settings=config)
    url, options = requests[-1]
    assert url == 'https://api.brevo.com/v3/smtp/email'
    assert options['headers']['api-key'] == 'test-only-key'
    assert options['follow_redirects'] is False and options['timeout'] == 12
    assert options['json']['to'] == [{'email': 'student@example.com'}]
    assert '483912' in options['json']['textContent'] and '483912' in options['json']['htmlContent']
    send_contact_email(ContactRequest(name='Student', email='student@example.com', message='A useful test message.'), settings=config)
    payload = requests[-1][1]['json']
    assert payload['sender']['email'] == settings.smtp_from_email
    assert payload['to'] == [{'email': 'inbox@example.com'}]
    assert payload['replyTo'] == {'email': 'student@example.com'}
    assert 'A useful test message.' in payload['textContent']


@pytest.mark.parametrize('status,payload', [(401, {}), (429, {}), (500, {}), (201, {})])
def test_brevo_rejects_unconfirmed_delivery_without_leaking_values(settings, monkeypatch, status, payload):
    from types import SimpleNamespace
    monkeypatch.setattr('email_service.httpx.post', lambda *_a, **_k: SimpleNamespace(status_code=status, json=lambda: payload))
    with pytest.raises(RuntimeError) as error:
        send_otp_email('student@example.com', '483912', settings=replace(settings, email_provider='brevo', brevo_api_key='test-only-key'))
    assert '483912' not in str(error.value) and 'test-only-key' not in str(error.value)
