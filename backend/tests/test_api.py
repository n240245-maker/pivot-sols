import pytest


def test_health_is_safe(client):
    response = client.get('/api/health')
    assert response.json() == {'status': 'ok', 'service': 'pivot-sols-api'}
    assert response.headers['cache-control'] == 'no-store'


@pytest.mark.parametrize('field,value', [
    ('name', ''), ('name', ' '), ('name', 'A'), ('student_id', ''),
    ('student_id', ' '), ('student_id', 'A'), ('student_id', '<script>'),
    ('academic_level', 'E2'), ('academic_level', ''),
])
def test_student_login_rejects_invalid_input_without_echo(client, field, value):
    body = {'name': 'Harsha', 'student_id': 'N240245', 'academic_level': 'E1'}
    response = client.post('/api/auth/login', json={**body, field: value})
    assert response.status_code == 400
    assert response.json()['code'] == 'invalid_request'
    assert str(value) not in response.text or not value.strip()


def test_student_login_requires_database_and_exact_origin(client):
    body = {'name': 'Harsha', 'student_id': 'N240245', 'academic_level': 'E1'}
    assert client.post('/api/auth/login', json=body).status_code == 403
    headers = {'Origin': 'http://localhost:5173', 'X-Pivot-Student': '1'}
    assert client.post('/api/auth/login', json=body, headers=headers).status_code == 503
    assert client.get('/api/auth/me').status_code == 503


def test_retired_student_otp_endpoints_are_absent(client):
    assert client.post('/api/auth/send-otp', json={}).status_code == 404
    assert client.post('/api/auth/verify-otp', json={}).status_code == 404


def test_student_login_rejects_email_and_otp_fields(client):
    body = {'name': 'Harsha', 'student_id': 'N240245', 'academic_level': 'E1'}
    headers = {'Origin': 'http://localhost:5173', 'X-Pivot-Student': '1'}
    for extra in ({'email': 'student@example.com'}, {'otp': '123456'}):
        assert client.post('/api/auth/login', json={**body, **extra}, headers=headers).status_code == 400


def test_cors_accepts_only_configured_origin(client):
    headers = {'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
               'Access-Control-Request-Headers': 'content-type,x-pivot-student'}
    response = client.options('/api/auth/login', headers=headers)
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'
    headers['Origin'] = 'https://unapproved.example.com'
    response = client.options('/api/auth/login', headers=headers)
    assert response.status_code == 400
