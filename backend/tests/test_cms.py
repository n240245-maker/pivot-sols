"""Real PostgreSQL integration tests inside rollback-only outer transactions.

No table/database deletion, no production-like data cleanup and no real email.
"""
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import create_app
from cms.auth import COOKIE, hash_password, password_matches
from cms.database import create_database_engine
from cms import models as m
from cms.repository import RESOURCES
from cms.schemas import ExperimentInput
from scripts.seed_existing_content import seed


@pytest.fixture(scope='module')
def engine():
    engine = create_database_engine()
    try:
        with engine.connect() as connection:
            assert connection.execute(text('select current_database()')).scalar() == 'pivot_sols'
    except Exception:
        pytest.fail('CMS integration tests require the configured local PostgreSQL database; connection details hidden.', pytrace=False)
    yield engine
    engine.dispose()


@pytest.fixture
def cms(engine, settings):
    connection = engine.connect()
    outer = connection.begin()
    factory = lambda: Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False)
    db = factory()
    email = f'qa-{uuid4().hex}@example.com'
    password = 'Test-only strong password 284!'
    admin = m.Admin(email=email, password_hash=hash_password(password), display_name='QA Admin')
    db.add(admin)
    db.commit()
    delivered = []
    app = create_app(settings, db_factory=factory)
    clock = [datetime.now(timezone.utc)]
    app.state.admin_security.clock = lambda: clock[0]
    with TestClient(app, headers={'Origin': settings.frontend_url, 'X-Pivot-Admin': '1'}) as client:
        yield {'client': client, 'db': db, 'admin': admin, 'email': email, 'password': password,
               'delivered': delivered, 'clock': clock, 'app': app}
    db.close()
    outer.rollback()
    connection.close()


def login(cms):
    client = cms['client']
    response = client.post('/api/admin/auth/login', json={'email': cms['email'], 'password': cms['password']})
    assert response.status_code == 200, response.text
    client.headers['X-CSRF-Token'] = response.json()['csrf_token']
    return response


def tree(cms):
    db = cms['db']
    suffix = uuid4().hex[:12]
    branch = m.Branch(slug=f'qa-{suffix}', name='QA Branch', description='A rollback-only branch.', status='published')
    domain = m.CareerDomain(slug=f'qa-domain-{suffix}', name='QA Domain', category='Software', status='published')
    db.add_all([branch, domain]); db.flush()
    semester = m.Semester(academic_level='E1', branch_id=branch.id, number=1, name='Semester 1', status='published')
    db.add(semester); db.flush()
    subject = m.Subject(semester_id=semester.id, slug='qa-subject', name='QA Subject', status='published')
    lab = m.Lab(semester_id=semester.id, slug='qa-lab', name='QA Lab', status='published')
    db.add_all([subject, lab]); db.commit()
    return branch, semester, subject, lab, domain, suffix


def bodies(cms):
    b, s, subject, lab, domain, suffix = tree(cms)
    roadmap = [{'title': 'Foundations', 'description': 'Build and test a small example.'}]
    return {
        'branches': {'slug': f'qa-new-{suffix}', 'name': 'Test Branch', 'description': 'A useful branch introduction.'},
        'semesters': {'academic_level': 'E1', 'branch_id': b.id, 'number': 2, 'name': 'Semester 2'},
        'subjects': {'semester_id': s.id, 'slug': 'another-subject', 'name': 'Another Subject'},
        'books': {'subject_id': subject.id, 'title': 'Test Book', 'authors': ['Test Author']},
        'labs': {'semester_id': s.id, 'slug': 'another-lab', 'name': 'Another Lab'},
        'experiments': {'lab_id': lab.id, 'title': 'Test Experiment', 'slug': 'test-experiment', 'objective': 'Measure a signal.',
            'theory': 'Sampling represents a signal.', 'apparatus': ['Simulator'], 'procedure': ['Create a signal.'],
            'expected_result': 'A sampled signal.', 'precautions': ['Check units.'], 'video_type': 'youtube', 'video_url': 'https://youtu.be/dQw4w9WgXcQ'},
        'career-domains': {'slug': f'qa-new-domain-{suffix}', 'name': 'Test Domain', 'category': 'Software', 'summary': 'A short summary.',
            'description': 'A useful explanation.', 'what_you_do': ['Build software.'], 'core_skills': ['Programming'], 'useful_subjects': ['Computing'], 'roadmap': roadmap},
        'career-roles': {'slug': f'qa-new-role-{suffix}', 'name': 'Test Role', 'domain_id': domain.id, 'summary': 'A short role summary.',
            'description': 'Build useful systems.', 'responsibilities': ['Test changes.'], 'skills': ['Programming'],
            'useful_subjects': ['Computing'], 'roadmap': roadmap, 'example_projects': ['Build a task manager.']},
    }


def test_schema_migration_and_constraints(engine):
    inspector = inspect(engine)
    assert set(model.__tablename__ for model, _ in RESOURCES.values()) <= set(inspector.get_table_names())
    assert inspector.get_foreign_keys('reference_books')[0]['referred_table'] == 'subjects'
    assert any(item['name'] == 'uq_subject_semester_slug' for item in inspector.get_unique_constraints('subjects'))
    assert any(item['name'] == 'uq_semester_p1' for item in inspector.get_indexes('semesters'))
    with engine.connect() as connection:
        assert connection.execute(text('select version_num from alembic_version')).scalar() == 'c84e7a0b6d22'


def test_password_session_and_logout_without_agent_otp(cms):
    db, client = cms['db'], cms['client']
    assert cms['admin'].password_hash.startswith('$argon2id$')
    assert password_matches(cms['admin'].password_hash, cms['password'])
    assert not password_matches(cms['admin'].password_hash, 'wrong')
    assert client.get('/api/admin/branches').status_code == 401
    assert client.post('/api/admin/auth/login', json={'email': cms['email'], 'password': 'wrong'}).status_code == 401
    logged_in = login(cms)
    cookie = logged_in.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=strict' in cookie and 'path=/api/admin' in cookie
    assert client.get('/api/admin/auth/me').status_code == 200
    assert client.get('/api/admin/catalog').status_code == 200
    assert db.scalar(select(m.AdminChallenge).where(m.AdminChallenge.admin_id == cms['admin'].id)) is None
    assert client.post('/api/admin/auth/verify', json={}).status_code == 404
    assert client.post('/api/admin/auth/resend', json={}).status_code == 404
    token = client.cookies.get(COOKIE)
    assert client.post('/api/admin/auth/logout').status_code == 200
    client.cookies.set(COOKIE, token, path='/api/admin')
    assert client.get('/api/admin/auth/me').status_code == 401


def test_admin_origin_csrf_and_student_session_rejected(cms):
    client = cms['client']
    assert client.post('/api/admin/auth/login', headers={'Origin': 'https://untrusted.example'}, json={'email': cms['email'], 'password': cms['password']}).status_code == 403
    assert not cms['delivered']
    client.headers['X-Pivot-Student'] = '1'
    assert client.post('/api/auth/login', json={'name': 'Test Student', 'student_id': 'N240245', 'academic_level': 'E1'}).status_code == 200
    for resource in RESOURCES:
        assert client.get(f'/api/admin/{resource}').status_code == 401
        assert client.post(f'/api/admin/{resource}', json={}).status_code == 401
    login(cms)
    assert client.post('/api/admin/branches', headers={'X-CSRF-Token': 'wrong'}, json={'slug': 'qa-test', 'name': 'Test'}).status_code == 403
    assert client.post('/api/admin/branches', headers={'Origin': 'https://untrusted.example'}, json={'slug': 'qa-test', 'name': 'Test'}).status_code == 403


def test_agent_login_has_no_otp_and_session_expires(cms):
    client = cms['client']
    result = login(cms)
    assert 'csrf_token' in result.json() and 'challenge' not in result.json()
    assert cms['delivered'] == []
    cms['clock'][0] += timedelta(hours=9)
    assert client.get('/api/admin/auth/me').status_code == 401


def test_admin_session_idle_and_production_cookie(cms):
    cms['app'].state.admin_security.secure_cookie = True
    verified = login(cms)
    assert 'Secure' in verified.headers['set-cookie']
    assert 'SameSite=none' in verified.headers['set-cookie']
    # HTTPS-only cookie is not sent over this HTTP test client.
    assert cms['client'].get('/api/admin/auth/me').status_code == 401
    cms['client'].cookies.set(COOKIE, verified.cookies.get(COOKIE), path='/api/admin')
    cms['clock'][0] += timedelta(minutes=31)
    assert cms['client'].get('/api/admin/auth/me').status_code == 401


def test_cross_site_https_agent_session_cors_csrf_and_logout(cms, settings):
    from dataclasses import replace
    production = replace(settings, frontend_url='https://pivot-sols.vercel.app')
    factory = lambda: Session(bind=cms['db'].get_bind(), join_transaction_mode='create_savepoint', expire_on_commit=False)
    app = create_app(production, db_factory=factory)
    headers = {'Origin': production.frontend_url, 'X-Pivot-Admin': '1'}
    with TestClient(app, base_url='https://api.example.test', headers=headers) as client:
        response = login({**cms, 'client': client})
        cookie = response.headers['set-cookie'].lower()
        assert all(value in cookie for value in ['secure', 'httponly', 'samesite=none', 'path=/api/admin'])
        assert response.headers['access-control-allow-origin'] == production.frontend_url
        assert response.headers['access-control-allow-credentials'] == 'true'
        assert client.get('/api/admin/auth/me').status_code == 200
        assert client.get('/api/admin/catalog').status_code == 200
        assert client.post('/api/admin/branches', headers={'Origin': 'https://untrusted.example'}, json={}).status_code == 403
        assert client.post('/api/admin/branches', headers={'X-CSRF-Token': 'wrong'}, json={}).status_code == 403
        token = client.cookies.get(COOKIE)
        logout = client.post('/api/admin/auth/logout')
        assert logout.status_code == 200
        assert 'samesite=none' in logout.headers['set-cookie'].lower()
        assert client.get('/api/admin/auth/me').status_code == 401
        client.cookies.set(COOKIE, token, path='/api/admin')
        assert client.get('/api/admin/catalog').status_code == 401


def test_content_transfer_is_atomic_idempotent_and_refuses_overwrite(engine):
    from sqlalchemy.schema import CreateSchema
    from cms.database import Base
    from scripts.transfer_content import import_content, normalized_snapshot, snapshot
    from copy import deepcopy
    # A transaction-only test schema leaves every existing local record untouched.
    with engine.connect() as connection:
        data = snapshot(connection)
        connection.rollback()
        transaction = connection.begin()
        schema = 'transfer_test_' + uuid4().hex
        connection.execute(CreateSchema(schema))
        isolated = connection.execution_options(schema_translate_map={None: schema})
        try:
            Base.metadata.create_all(isolated)
            assert import_content(isolated, data) == 'imported and verified'
            assert snapshot(isolated) == data
            assert import_content(isolated, data) == 'already imported; no changes'
            utc_data = normalized_snapshot(data)
            assert import_content(isolated, utc_data) == 'already imported; no changes'
            changed = deepcopy(data)
            changed['tables']['branches'][0]['name'] = 'Conflicting remote edit'
            with pytest.raises(ValueError, match='refusing to overwrite'):
                import_content(isolated, changed)
            assert snapshot(isolated) == data
            assert not any('admin' in name for name in data['tables'])
        finally:
            transaction.rollback()


@pytest.mark.parametrize('resource', ['branches', 'semesters', 'subjects', 'books', 'labs', 'experiments', 'career-domains', 'career-roles'])
def test_crud_publish_unpublish_archive_and_public_visibility(cms, resource):
    login(cms)
    client = cms['client']
    body = bodies(cms)[resource]
    created = client.post(f'/api/admin/{resource}', json=body)
    assert created.status_code == 201, created.text
    row = created.json()
    row_id = row['id']
    assert row['status'] == 'draft'
    assert row_id not in [r['id'] for r in client.get(f'/api/public/{resource}').json()]
    assert client.get(f'/api/admin/{resource}/{row_id}').status_code == 200
    updated = client.put(f'/api/admin/{resource}/{row_id}', json={**body, 'sort_order': 7, 'expected_updated_at': row['updated_at']})
    assert updated.status_code == 200, updated.text
    assert updated.json()['sort_order'] == 7
    stale = client.put(f'/api/admin/{resource}/{row_id}', json={**body, 'expected_updated_at': row['updated_at']})
    assert stale.status_code == 409
    for status, visible in [('published', True), ('draft', False), ('published', True), ('archived', False)]:
        response = client.patch(f'/api/admin/{resource}/{row_id}/status', json={'status': status})
        assert response.status_code == 200, response.text
        assert (row_id in [r['id'] for r in client.get(f'/api/public/{resource}').json()]) == visible
    assert client.get(f'/api/admin/{resource}/{row_id}').json()['status'] == 'archived'


def test_parent_dependency_checks_and_incomplete_drafts(cms):
    login(cms)
    client = cms['client']
    b, semester, subject, lab, domain, suffix = tree(cms)
    blocked = client.patch(f'/api/admin/branches/{b.id}/status', json={'status': 'archived'})
    assert blocked.status_code == 409 and blocked.json()['detail']['dependencies']
    draft = client.post('/api/admin/experiments', json={'lab_id': lab.id, 'slug': 'incomplete', 'title': 'Incomplete'})
    assert draft.status_code == 201
    assert client.patch(f"/api/admin/experiments/{draft.json()['id']}/status", json={'status': 'published'}).status_code == 400
    # Parents hidden by a non-API edit still never leak descendants through public APIs.
    b.status = 'draft'; cms['db'].commit()
    public = client.get('/api/public/catalog').json()
    assert b.slug not in [item['id'] for item in public['branches']]
    assert subject.id not in [item['id'] for item in public['books']['subjects']]
    assert lab.id not in [item['id'] for item in public['labs']['labs']]


def test_site_content_editor_validation_and_visibility(cms):
    login(cms)
    client, db = cms['client'], cms['db']
    existing = db.scalar(select(m.SiteContent).where(m.SiteContent.key == 'about'))
    if existing:
        existing.key = 'qa-original-about'; db.commit()  # Isolated outer transaction; restored by rollback.
    body = {'key': 'about', 'title': 'QA About', 'content_json': {'intro': 'QA intro', 'why': [{'title': 'Useful', 'description': 'Useful content'}], 'goal': 'Help students'}}
    created = client.post('/api/admin/site-content', json=body)
    assert created.status_code == 201, created.text
    row_id = created.json()['id']
    assert client.get('/api/public/site-content/about').status_code == 404
    assert client.patch(f'/api/admin/site-content/{row_id}/status', json={'status': 'published'}).status_code == 200
    assert client.get('/api/public/catalog').json()['site']['about']['intro'] == 'QA intro'
    assert client.patch(f'/api/admin/site-content/{row_id}/status', json={'status': 'archived'}).status_code == 200
    assert client.get('/api/public/site-content/about').status_code == 404


@pytest.mark.parametrize('url', ['javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', '<iframe></iframe>', 'http://youtu.be/dQw4w9WgXcQ'])
def test_unsafe_video_input_rejected(url):
    with pytest.raises(ValueError):
        ExperimentInput(lab_id=uuid4(), slug='test', title='Test', video_type='youtube', video_url=url)


def test_youtube_normalizes_and_seed_is_idempotent(cms):
    item = ExperimentInput(lab_id=uuid4(), slug='test', title='Test', video_type='youtube', video_url='https://youtu.be/dQw4w9WgXcQ?t=30')
    assert item.video_url == 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    data = json.loads((Path(__file__).parents[1] / 'seed_content.json').read_text(encoding='utf-8'))
    assert seed(cms['db'], data) == {}


def test_foreign_key_and_unique_constraint_enforced(cms):
    db = cms['db']
    b, semester, subject, lab, domain, suffix = tree(cms)
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(m.Subject(semester_id=semester.id, name='Duplicate', slug=subject.slug)); db.flush()
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(m.Lab(semester_id=str(uuid4()), name='Orphan', slug='orphan')); db.flush()


def test_duplicate_api_records_return_conflict_without_partial_changes(cms):
    login(cms)
    client = cms['client']
    assert client.post('/api/admin/branches', json={'slug': 'common', 'name': 'Reserved'}).status_code == 422
    body = bodies(cms)['subjects']
    first = client.post('/api/admin/subjects', json=body)
    assert first.status_code == 201
    duplicate = client.post('/api/admin/subjects', json={**body, 'status': 'published'})
    assert duplicate.status_code == 409
    assert 'matching record' in duplicate.json()['detail']['message']
    invalid = client.post('/api/admin/books', json={'subject_id': str(uuid4()), 'title': 'Orphan'})
    assert invalid.status_code == 404
    assert not any(item['title'] == 'Orphan' for item in client.get('/api/admin/books').json())


def test_inactive_agent_cannot_sign_in(cms):
    cms['admin'].is_active = False
    cms['db'].commit()
    response = cms['client'].post('/api/admin/auth/login', json={'email': cms['email'], 'password': cms['password']})
    assert response.status_code == 401
    assert response.json()['detail']['message'] == 'Email or password is incorrect.'


def test_admin_rate_limit_is_database_backed(cms):
    client = cms['client']
    for _ in range(8):
        assert client.post('/api/admin/auth/login', json={'email': cms['email'], 'password': 'wrong'}).status_code == 401
    assert client.post('/api/admin/auth/login', json={'email': cms['email'], 'password': cms['password']}).status_code == 429
    assert not cms['delivered']
    cms['clock'][0] += timedelta(minutes=16)
    assert client.post('/api/admin/auth/login', json={'email': cms['email'], 'password': cms['password']}).status_code == 200


def test_deactivated_admin_loses_api_access(cms):
    login(cms)
    cms['admin'].is_active = False
    cms['db'].commit()
    assert cms['client'].get('/api/admin/catalog').status_code == 403
    assert cms['client'].get('/api/public/catalog').status_code == 200


def test_public_catalog_tracks_edits_and_normalized_experiment_video(cms):
    login(cms)
    client = cms['client']
    content = bodies(cms)
    for resource in ['books', 'experiments', 'career-domains']:
        body = {**content[resource], 'status': 'published'}
        first = client.post(f'/api/admin/{resource}', json=body)
        assert first.status_code == 201, first.text
        identity = first.json()['id']
        field = 'name' if resource == 'career-domains' else 'title'
        body[field] = f'Updated database {resource}'
        assert client.put(f'/api/admin/{resource}/{identity}', json=body).status_code == 200
        public = client.get('/api/public/catalog').json()
        rows = public['books']['books'] if resource == 'books' else public['domains'] if resource == 'career-domains' else [e for lab in public['labs']['labs'] for e in lab['experiments']]
        actual = next(row for row in rows if row['id'] == identity)
        assert actual[field] == body[field]
        if resource == 'experiments':
            assert actual['videoUrl'] == 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
