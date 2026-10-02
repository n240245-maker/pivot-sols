"""Rollback-only integration tests for new directories, resources and reports."""
from uuid import uuid4
from datetime import timedelta
from hashlib import sha256

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import create_app
from cms import models as m
from cms.auth import hash_password
from cms.database import create_database_engine
from cms.storage import identify
from student_session import COOKIE, cookie_options, identifier


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
    app = create_app(settings, db_factory=factory)
    with TestClient(app, headers={'Origin': settings.frontend_url, 'X-Pivot-Admin': '1'}) as client:
        yield client, factory, [], email
    outer.rollback()
    connection.close()
    engine.dispose()


def agent(feature):
    client, _, _, email = feature
    result = client.post('/api/admin/auth/login', json={'email': email, 'password': 'Test-only password 123!'})
    assert result.status_code == 200
    client.headers['X-CSRF-Token'] = result.json()['csrf_token']
    return client


def student(client, student_id, level='P1'):
    client.headers['X-Pivot-Student'] = '1'
    result = client.post('/api/auth/login', json={'name': 'Test Student', 'student_id': student_id, 'academic_level': level})
    assert result.status_code == 200
    assert 'httponly' in result.headers['set-cookie'].lower()


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


def test_career_youtube_urls_are_normalized_and_video_only_resources_publish(feature):
    client, _, _, _ = feature
    agent(feature)
    slug = f'qa-video-{uuid4().hex[:8]}'
    branch = client.post('/api/admin/branches', json={'slug': slug, 'name': 'QA Video Branch',
        'description': 'Test branch', 'status': 'published'}).json()
    video_id = 'dQw4w9WgXcQ'
    for resource_type, url in [('domain', f'https://www.youtube.com/watch?v={video_id}&t=10'),
                               ('job', f'https://youtu.be/{video_id}')]:
        body = {'resource_type': resource_type, 'branch_id': branch['id'],
                'title': f'QA {resource_type} video', 'youtube_url': url, 'status': 'published'}
        created = client.post('/api/admin/career-resources', json=body)
        assert created.status_code == 201, created.text
        assert created.json()['youtube_url'] == f'https://www.youtube.com/watch?v={video_id}'
        listed = client.get(f'/api/public/career-resources?type={resource_type}&branch={slug}').json()
        assert len(listed) == 1 and listed[0]['youtube_url'].endswith(video_id)
    for bad in ('https://evil.example/watch?v=dQw4w9WgXcQ',
                'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
                '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
                'javascript:alert(1)'):
        response = client.post('/api/admin/career-resources', json={
            'resource_type': 'domain', 'branch_id': branch['id'], 'title': 'Invalid video',
            'youtube_url': bad, 'status': 'published'})
        assert response.status_code == 422


def test_student_cookie_is_secure_on_hosted_frontend():
    hosted = cookie_options('https://pivot-sols.vercel.app')
    assert hosted == {'httponly': True, 'secure': True, 'samesite': 'lax', 'path': '/'}
    assert cookie_options('http://localhost:5173')['secure'] is False


def test_student_session_restores_expires_and_revokes(feature):
    client, factory, _, _ = feature
    student_id = f'N{uuid4().hex[:10].upper()}'
    assert client.get('/api/auth/me').status_code == 401
    client.headers['X-Pivot-Student'] = '1'
    logged_in = client.post('/api/auth/login', json={'name': ' Session Student ',
        'student_id': student_id.lower(), 'academic_level': 'E1'})
    assert logged_in.status_code == 200
    assert logged_in.json()['student']['studentId'] == student_id
    assert 'email' not in logged_in.json()['student']
    cookie = logged_in.headers['set-cookie'].lower()
    assert 'max-age=2592000' in cookie and 'httponly' in cookie and 'path=/' in cookie
    raw_token = client.cookies.get(COOKIE)
    assert raw_token and len(raw_token) >= 40
    with factory() as db:
        row = db.scalar(select(m.StudentSession).where(m.StudentSession.student_id == student_id))
        assert row.student_email is None
        assert row.token_hash == sha256(raw_token.encode()).hexdigest()
        assert row.token_hash != raw_token
        assert abs((row.expires_at - row.created_at).total_seconds() - 2592000) < 2
        session_id = row.id
    profile = client.get('/api/auth/me').json()['profile']
    assert profile['academicLevel'] == 'E1' and profile['studentId'] == student_id
    assert profile['name'] == 'Session Student' and 'email' not in profile and 'token' not in profile
    with TestClient(client.app) as reopened:
        reopened.cookies.set(COOKIE, raw_token)
        assert reopened.get('/api/auth/me').json()['profile']['academicLevel'] == 'E1'
    client.cookies.set(COOKIE, 'forged-token')
    assert client.get('/api/auth/me').status_code == 401
    client.cookies.set(COOKIE, raw_token)
    client.headers['X-Pivot-Student'] = '1'
    assert client.post('/api/auth/logout').json() == {'success': True}
    assert client.get('/api/auth/me').status_code == 401
    with factory() as db:
        assert db.get(m.StudentSession, session_id).revoked_at is not None

    client.cookies.clear()
    next_id = f'N{uuid4().hex[:10].upper()}'
    assert client.post('/api/auth/login', json={'name': 'P1 Student',
        'student_id': next_id, 'academic_level': 'P1'}).status_code == 200
    assert client.get('/api/auth/me').json()['profile']['academicLevel'] == 'P1'
    with factory() as db:
        row = db.scalar(select(m.StudentSession).where(m.StudentSession.student_id == next_id))
        row.expires_at = row.created_at - timedelta(seconds=1)
        db.commit()
    assert client.get('/api/auth/me').status_code == 401


def test_problem_author_identity_comes_from_session_not_request(feature):
    client, factory, _, _ = feature
    student_id = f'N{uuid4().hex[:10].upper()}'
    student(client, student_id)
    body = {'title': 'Test internet issue', 'description': 'The internet is unavailable in the test area.',
            'academic_level': 'P1', 'priority': 'medium'}
    assert client.post('/api/problems', json={**body, 'author_identifier': 'another-student'}).status_code == 422
    created = client.post('/api/problems', json=body)
    assert created.status_code == 201
    with factory() as db:
        row = db.get(m.StudentProblem, created.json()['id'])
        assert row.author_identifier == identifier(client.app.state.admin_security.settings.otp_secret, student_id)


def test_student_reports_have_server_identity_and_one_reaction_per_student(feature):
    client, factory, _, _ = feature
    client.headers['X-Pivot-Student'] = '1'
    body = {'title': 'Test water supply', 'description': 'Water supply is unavailable in the test block.',
            'academic_level': 'P1', 'priority': 'high', 'category': 'Infrastructure'}
    assert client.post('/api/problems', json=body).status_code == 401
    first_id = f'N{uuid4().hex[:10].upper()}'
    student(client, first_id)
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
    student(client, first_id)
    assert client.post(f'/api/problems/{report_id}/reaction', json={'reaction': 'dislike'}).json()['dislikes'] == 0
    student(client, f'N{uuid4().hex[:10].upper()}')
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
    client, factory, _, _ = feature
    student(client, f'N{uuid4().hex[:10].upper()}')
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
