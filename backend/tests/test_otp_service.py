from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
import re
import threading

import pytest

from otp_service import OtpError, OtpService

EMAIL = "student@example.com"


def test_generated_code_is_six_digits_with_leading_zero_support(setup, monkeypatch):
    service, _, delivered = setup
    monkeypatch.setattr("otp_service.secrets.randbelow", lambda limit: 7)
    service.send(EMAIL)
    assert delivered[-1][1] == "000007"
    assert re.fullmatch(r"[0-9]{6}", delivered[-1][1])


def test_only_hash_is_stored_and_bound_to_email_and_secret(setup):
    service, _, delivered = setup
    service.send(EMAIL)
    code = delivered[-1][1]
    record = service._records[EMAIL]
    assert record.otp_hash != code
    assert record.otp_hash == service._hash(EMAIL, code)
    assert record.otp_hash != service._hash("another@example.com", code)
    assert record.otp_hash != OtpService("different", lambda *_: None)._hash(EMAIL, code)
    assert set(asdict(record)) == {"otp_hash", "expires_at", "attempts"}
    assert code not in repr(record)


def test_correct_code_is_single_use_and_deletes_record(setup):
    service, _, delivered = setup
    service.send(EMAIL)
    code = delivered[-1][1]
    service.verify(EMAIL, code)
    assert EMAIL not in service._records
    with pytest.raises(OtpError, match="incorrect"):
        service.verify(EMAIL, code)


def test_wrong_code_fails_and_increments_attempts(setup):
    service, _, delivered = setup
    service.send(EMAIL)
    wrong = "000000" if delivered[-1][1] != "000000" else "999999"
    with pytest.raises(OtpError) as error:
        service.verify(EMAIL, wrong)
    assert error.value.code == "invalid_otp"
    assert service._records[EMAIL].attempts == 1
    service.verify(EMAIL, delivered[-1][1])


def test_expiry_at_five_minutes_removes_record(setup):
    service, clock, delivered = setup
    service.send(EMAIL)
    clock.advance(300)
    with pytest.raises(OtpError) as error:
        service.verify(EMAIL, delivered[-1][1])
    assert error.value.code == "expired_otp"
    assert EMAIL not in service._records


def test_code_works_immediately_before_expiry(setup):
    service, clock, delivered = setup
    service.send(EMAIL)
    clock.advance(299.999)
    service.verify(EMAIL, delivered[-1][1])


def test_fifth_wrong_attempt_invalidates_even_the_correct_code(setup):
    service, _, delivered = setup
    service.send(EMAIL)
    code = delivered[-1][1]
    wrong = "000000" if code != "000000" else "999999"
    for attempt in range(5):
        with pytest.raises(OtpError) as error:
            service.verify(EMAIL, wrong)
        assert error.value.code == ("attempts_exceeded" if attempt == 4 else "invalid_otp")
    assert EMAIL not in service._records
    with pytest.raises(OtpError):
        service.verify(EMAIL, code)


def test_resend_cooldown_boundary_and_replacement(setup, monkeypatch):
    service, clock, delivered = setup
    codes = iter([381942, 381942, 720416])
    monkeypatch.setattr("otp_service.secrets.randbelow", lambda _: next(codes))
    service.send(EMAIL)
    old = delivered[-1][1]
    clock.advance(59)
    with pytest.raises(OtpError) as error:
        service.send(EMAIL)
    assert error.value.code == "resend_cooldown"
    assert error.value.retry_after == 1
    clock.advance(1)
    service.send(EMAIL)
    assert delivered[-1][1] != old  # Even a random collision cannot retain the old active code.
    with pytest.raises(OtpError):
        service.verify(EMAIL, old)
    service.verify(EMAIL, delivered[-1][1])


def test_rate_limit_survives_verification_and_resets_after_window(setup):
    service, clock, delivered = setup
    for _ in range(5):
        service.send(EMAIL)
        service.verify(EMAIL, delivered[-1][1])
        clock.advance(60)
    with pytest.raises(OtpError) as error:
        service.send(EMAIL)
    assert error.value.status == 429
    assert error.value.code == "rate_limited"
    assert error.value.retry_after == 600
    clock.advance(600)
    service.send(EMAIL)
    assert len(delivered) == 6


def test_sending_and_verifying_clean_expired_entries_without_resetting_rate_history(setup):
    service, clock, _ = setup
    service.send(EMAIL)
    clock.advance(300)
    service.send("other@example.com")
    assert EMAIL not in service._records
    assert EMAIL in service._history
    clock.advance(901)
    with pytest.raises(OtpError):
        service.verify("absent@example.com", "000000")
    assert service._records == {}
    assert service._history == {}


def test_smtp_failure_leaves_no_record_or_leaked_logs(settings, caplog):
    def fail(*_):
        raise RuntimeError("sensitive SMTP detail")
    service = OtpService(settings.otp_secret, fail)
    with pytest.raises(OtpError) as error:
        service.send(EMAIL)
    assert error.value.status == 503
    assert EMAIL not in service._records
    assert "sensitive" not in caplog.text
    assert settings.otp_secret not in caplog.text
    assert "SMTP delivery failed" in caplog.text


def test_failed_resend_also_invalidates_previous_code(setup):
    service, clock, delivered = setup
    service.send(EMAIL)
    code = delivered[-1][1]
    clock.advance(60)
    def fail(*_):
        raise TimeoutError
    service._sender = fail
    with pytest.raises(OtpError):
        service.send(EMAIL)
    with pytest.raises(OtpError):
        service.verify(EMAIL, code)


def test_concurrent_send_is_reserved_and_pending_code_cannot_verify(settings):
    entered, release = threading.Event(), threading.Event()
    def sender(*_):
        entered.set()
        assert release.wait(3)
    service = OtpService(settings.otp_secret, sender)
    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(service.send, EMAIL)
        assert entered.wait(3)
        try:
            with pytest.raises(OtpError) as error:
                service.send(EMAIL)
            assert error.value.code == "resend_cooldown"
            assert EMAIL not in service._records
            with pytest.raises(OtpError):
                service.verify(EMAIL, "000000")
        finally:
            release.set()
        first.result()
    assert EMAIL in service._records


def test_concurrent_verify_can_only_succeed_once(setup):
    service, _, delivered = setup
    service.send(EMAIL)
    def verify():
        try:
            service.verify(EMAIL, delivered[-1][1])
            return True
        except OtpError:
            return False
    with ThreadPoolExecutor(max_workers=5) as executor:
        assert sum(executor.map(lambda _: verify(), range(5))) == 1
