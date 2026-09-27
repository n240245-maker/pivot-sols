"""Rollback-only integration tests for new directories, resources and reports."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import create_app
from cms import models as m
from cms.auth import hash_password
from cms.database import create_database_engine
from cms.storage import identify
from otp_service import OtpService


@pytest.fixture
def feature(settings):
    engine = create_database_engine()
    connection = engine.connect()
    outer = connection.begin()
    factory = lambda: Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False)
    email = f'feature-{uuid4().hex}@example.com'
    with factory() as db:
        db.add(m.Admin(email=email, password_hash=hash_password('Test-only password 123!'), display_name='Feature Agent'))
        db.commit()
    delivered = []
    otp = OtpService(settings.otp_secret, lambda address, code: delivered.append((address, code)))
    app = create_app(settings, otp_service=otp, db_factory=factory,
                     admin_sender=lambda address, code: delivered.append((address, code)))
    with TestClient(app, headers={'Origin': settings.frontend_url, 'X-Pivot-Admin': '1'}) as client:
        yield client, factory, delivered, email
    outer.rollback()
    connection.close()
    engine.dispose()


def agent(feature):
    client, _, delivered, email = feature
    challenge = client.post('/api/admin/auth/login', json={'email': email, 'password': 'Test-only password 123!'}).json()['challenge']
    result = client.post('/api/admin/auth/verify', json={'challenge': challenge, 'otp': delivered[-1][1]})
    assert result.status_code == 200
    client.headers['X-CSRF-Token'] = result.json()['csrf_token']
    return client


def student(client, delivered, email):
    assert client.post('/api/auth/send-otp', json={'email': email}).status_code == 200
    result = client.post('/api/auth/verify-otp', json={'email': email, 'otp': delivered[-1][1]})
    assert result.status_code == 200
    assert 'httponly' in result.headers['set-cookie'].lower()
    client.headers['X-Pivot-Student'] = '1'


def test_new_content_crud_and_published_visibility(feature):
    client, factory, _, _ = feature
    agent(feature)
    room = {'name': 'Test Office', 'room_number': 'QA-1', 'phone_number': '08656-123456'}
    created = client.post('/api/admin/rooms', json=room)
    assert created.status_code == 201, created.text
    room_id = created.json()['id']
    edited = client.put(f'/api/admin/rooms/{room_id}', json={**room, 'name': 'Edited Test Office', 'sort_order': 4})
    assert edited.status_code == 200 and edited.json()['sort_order'] == 4
    assert client.get('/api/public/rooms').json() == []
    assert client.patch(f'/api/admin/rooms/{room_id}/status', json={'status': 'published'}).status_code == 200
    assert any(item['id'] == room_id for item in client.get('/api/public/rooms').json())
    assert client.delete(f'/api/admin/rooms/{room_id}').status_code == 409
    assert client.patch(f'/api/admin/rooms/{room_id}/status', json={'status': 'archived'}).status_code == 200
    assert client.get('/api/public/rooms').json() == []
    draft = client.post('/api/admin/rooms', json={**room, 'room_number': 'QA-2'}).json()
    assert client.delete(f"/api/admin/rooms/{draft['id']}").json() == {'success': True}

    subject = client.post('/api/admin/faculty-subjects', json={'name': 'QA Mathematics', 'slug': 'qa-mathematics'}).json()
    member = client.post('/api/admin/faculty', json={'subject_id': subject['id'], 'name': 'QA Faculty'}).json()
    assert client.delete(f"/api/admin/faculty-subjects/{subject['id']}").status_code == 409
    assert client.put(f"/api/admin/faculty/{member['id']}", json={'subject_id': subject['id'], 'name': 'Edited QA Faculty', 'sort_order': 2}).json()['sort_order'] == 2
    assert client.get('/api/public/faculty').json() == []
    assert client.patch(f"/api/admin/faculty-subjects/{subject['id']}/status", json={'status': 'published'}).status_code == 200
    assert client.patch(f"/api/admin/faculty/{member['id']}/status", json={'status': 'published'}).status_code == 200
    assert any(item['id'] == member['id'] for item in client.get('/api/public/faculty').json())
    assert client.patch(f"/api/admin/faculty/{member['id']}/status", json={'status': 'archived'}).status_code == 200
    assert client.get('/api/public/faculty').json() == []


def test_career_resource_filters_and_links(feature):
    client, _, _, _ = feature
    agent(feature)
    suffix = uuid4().hex[:8]
    branches = []
    for slug in (f'qa-cse-{suffix}', f'qa-ece-{suffix}'):
        row = client.post('/api/admin/branches', json={'slug': slug, 'name': slug, 'description': 'Test branch', 'status': 'published'})
        assert row.status_code == 201, row.text
        branches.append(row.json())
    body = {'resource_type': 'domain', 'branch_id': branches[0]['id'], 'title': 'QA Domain PDF',
            'pdf_url': 'https://example.com/domain.pdf', 'status': 'published'}
    created = client.post('/api/admin/career-resources', json=body)
    assert created.status_code == 201, created.text
    edited = client.put(f"/api/admin/career-resources/{created.json()['id']}", json={**body, 'title': 'Edited QA Domain PDF'})
    assert edited.status_code == 200 and edited.json()['title'] == 'Edited QA Domain PDF'
    assert len(client.get(f"/api/public/career-resources?type=domain&branch={branches[0]['slug']}").json()) == 1
    assert client.get(f"/api/public/career-resources?type=job&branch={branches[0]['slug']}").json() == []
    assert client.get(f"/api/public/career-resources?type=domain&branch={branches[1]['slug']}").json() == []
    assert client.post('/api/admin/career-resources', json={**body, 'pdf_url': 'javascript:alert(1)'}).status_code == 422
    assert client.post('/api/admin/career-resources', json={**body, 'pdf_url': None, 'supporting_url': None}).status_code == 422
    assert client.patch(f"/api/admin/career-resources/{created.json()['id']}/status", json={'status': 'archived'}).status_code == 200
    assert client.get(f"/api/public/career-resources?type=domain&branch={branches[0]['slug']}").json() == []


def test_student_reports_have_server_identity_and_one_reaction_per_student(feature):
    client, factory, delivered, _ = feature
    client.headers['X-Pivot-Student'] = '1'
    body = {'title': 'Test water supply', 'description': 'Water supply is unavailable in the test block.',
            'academic_level': 'P1', 'priority': 'high', 'category': 'Infrastructure'}
    assert client.post('/api/problems', json=body).status_code == 401
    student(client, delivered, f'student-a-{uuid4().hex}@example.com')
    assert client.post('/api/problems', json={**body, 'priority': 'urgent'}).status_code == 422
    assert client.post('/api/problems', json={**body, 'academic_level': 'P2'}).status_code == 422
    created = client.post('/api/problems', json=body)
    assert created.status_code == 201, created.text
    report_id = created.json()['id']
    assert 'author_identifier' not in created.json()
    assert client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'like'}).json()['likes'] == 1
    assert client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'like'}).json()['likes'] == 0
    assert client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'like'}).json()['likes'] == 1
    switched = client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'dislike'}).json()
    assert (switched['likes'], switched['dislikes']) == (0, 1)
    with factory() as db:
        assert db.scalar(select(m.ProblemReaction).where(m.ProblemReaction.problem_id == report_id)) is not None
    student(client, delivered, f'student-b-{uuid4().hex}@example.com')
    assert client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'like'}).json()['likes'] == 1
    public = client.get('/api/public/problems').json()[0]
    assert 'author_identifier' not in public and 'student_identifier' not in public
    assert client.get('/api/public/problems?level=E1').json() == []
    assert client.get('/api/public/problems?priority=low').json() == []
    agent(feature)
    in_progress = client.put(f'/api/admin/problems/{report_id}', json={**body, 'title': 'Edited water supply', 'status': 'in_progress'})
    assert in_progress.status_code == 200 and in_progress.json()['title'] == 'Edited water supply'
    updated = client.put(f'/api/admin/problems/{report_id}', json={**body, 'status': 'resolved'})
    assert updated.status_code == 200 and updated.json()['status'] == 'resolved'
    archived = client.put(f'/api/admin/problems/{report_id}', json={**body, 'status': 'archived'})
    assert archived.status_code == 200
    assert client.get('/api/public/problems').json() == []


def test_problem_filters_and_trending_are_deterministic(feature):
    client, factory, delivered, _ = feature
    student(client, delivered, f'student-rank-{uuid4().hex}@example.com')
    records = [
        ('Low priority issue', 'P1', 'low'),
        ('Medium priority issue', 'E1', 'medium'),
        ('High priority issue', 'P1', 'high'),
    ]
    for title, level, priority in records:
        response = client.post('/api/problems', json={'title': title,
            'description': f'Test description for {title} is long enough.',
            'academic_level': level, 'priority': priority})
        assert response.status_code == 201, response.text
    first = client.get('/api/public/problems?sort=trending').json()
    second = client.get('/api/public/problems?sort=trending').json()
    assert [item['id'] for item in first] == [item['id'] for item in second]
    assert [item['priority'] for item in first] == ['high', 'medium', 'low']
    assert len(client.get('/api/public/problems?priority=high').json()) == 1
    assert len(client.get('/api/public/problems?priority=medium').json()) == 1
    assert len(client.get('/api/public/problems?priority=low').json()) == 1
    assert len(client.get('/api/public/problems?level=P1').json()) == 2
    assert len(client.get('/api/public/problems?level=E1').json()) == 1


def test_upload_validation_and_mocked_storage(feature, monkeypatch):
    client, _, _, _ = feature
    agent(feature)
    assert client.post('/api/admin/uploads/pdf', files={'file': ('bad.pdf', b'<html>bad</html>', 'application/pdf')}).status_code == 503
    class MemoryStorage:
        def put(self, key, data, content_type, filename):
            assert key.startswith('pivot-sols/')
            return 'https://storage.example.test/' + key
    monkeypatch.setattr('cms.storage.ObjectStorage.from_env', lambda: MemoryStorage())
    assert client.post('/api/admin/uploads/image', files={'file': ('bad.html', b'<script>x</script>', 'text/html')}).status_code == 422
    assert client.post('/api/admin/uploads/pdf', files={'file': ('bad.pdf', b'<html>x</html>', 'application/pdf')}).status_code == 422
    good = client.post('/api/admin/uploads/pdf', files={'file': ('guide.pdf', b'%PDF-1.7\ncontent', 'application/pdf')})
    assert good.status_code == 200 and good.json()['url'].endswith('.pdf')
    picture = client.post('/api/admin/uploads/image', files={'file': ('photo.png', b'\x89PNG\r\n\x1a\n' + b'photo', 'image/png')})
    assert picture.status_code == 200 and picture.json()['url'].endswith('.png')
