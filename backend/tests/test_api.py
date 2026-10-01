import pytest


def test_health_is_safe(client):
    response = client.get("/api/health")
    assert response.json() == {"status": "ok", "service": "pivot-sols-api"}
    assert response.headers["cache-control"] == "no-store"


def test_send_normalizes_email_never_returns_code_and_verify_succeeds(client, setup):
    _, _, delivered = setup
    response = client.post("/api/auth/send-otp", json={"email": " Student@Example.com "})
    assert response.status_code == 200
    assert response.json() == {"success": True, "message": "OTP sent successfully"}
    assert delivered[-1][0] == "student@example.com"
    code = delivered[-1][1]
    assert code not in response.text
    verified = client.post("/api/auth/verify-otp", json={"email": "STUDENT@example.com", "otp": code})
    assert verified.json() == {"success": True, "verified": True}
    assert client.post("/api/auth/verify-otp", json={"email": "student@example.com", "otp": code}).status_code == 400


@pytest.mark.parametrize("email", ["invalid", "a@", "a b@example.com", "", "x@example.com\nBcc: other@example.com"])
def test_invalid_email_is_rejected_without_echoing_input(client, setup, email):
    response = client.post("/api/auth/send-otp", json={"email": email})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_request"
    assert setup[2] == []
    assert "input" not in response.json()


@pytest.mark.parametrize("otp", ["12345", "1234567", "abcdef", "１２３４５６", "483912\n", 483912])
def test_otp_format_requires_exactly_six_ascii_digits_and_no_input_echo(client, otp):
    response = client.post("/api/auth/verify-otp", json={"email": "student@example.com", "otp": otp})
    assert response.status_code == 400
    assert str(otp) not in response.text


def test_cooldown_retry_after_and_error_codes(client, setup):
    client.post("/api/auth/send-otp", json={"email": "student@example.com"})
    response = client.post("/api/auth/send-otp", json={"email": "student@example.com"})
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "60"
    assert response.json()["retry_after"] == 60
    setup[1].advance(300)
    response = client.post("/api/auth/verify-otp", json={"email": "student@example.com", "otp": setup[2][-1][1]})
    assert response.status_code == 400
    assert response.json()["code"] == "expired_otp"


def test_smtp_error_is_generic_503(client, setup):
    def fail(*_):
        raise RuntimeError("private detail")
    setup[0]._sender = fail
    response = client.post("/api/auth/send-otp", json={"email": "student@example.com"})
    assert response.status_code == 503
    assert response.json()["message"] == "We couldn't send your verification code. Please try again."
    assert "private" not in response.text
    assert setup[0]._records == {}


def test_cors_accepts_only_configured_origin(client):
    headers = {"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"}
    response = client.options("/api/auth/send-otp", headers=headers)
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    headers["Origin"] = "https://unapproved.example.com"
    response = client.options("/api/auth/send-otp", headers=headers)
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
