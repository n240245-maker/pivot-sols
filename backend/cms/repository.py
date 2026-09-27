from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from . import models as m, schemas as s

RESOURCES = {
    'branches': (m.Branch, s.BranchInput), 'semesters': (m.Semester, s.SemesterInput),
    'subjects': (m.Subject, s.SubjectInput), 'books': (m.ReferenceBook, s.BookInput),
    'labs': (m.Lab, s.LabInput), 'experiments': (m.Experiment, s.ExperimentInput),
    'career-domains': (m.CareerDomain, s.DomainInput), 'career-roles': (m.CareerRole, s.RoleInput),
    'site-content': (m.SiteContent, s.SiteContentInput),
    'rooms': (m.InformationRoom, s.RoomInput), 'faculty-subjects': (m.FacultySubject, s.FacultySubjectInput),
    'faculty': (m.FacultyMember, s.FacultyMemberInput), 'career-resources': (m.CareerResource, s.CareerResourceInput),
}
PARENTS = {m.Semester: ('branch_id', m.Branch), m.Subject: ('semester_id', m.Semester),
           m.ReferenceBook: ('subject_id', m.Subject), m.Lab: ('semester_id', m.Semester),
           m.Experiment: ('lab_id', m.Lab), m.CareerRole: ('domain_id', m.CareerDomain),
           m.FacultyMember: ('subject_id', m.FacultySubject), m.CareerResource: ('branch_id', m.Branch)}
RELATIONS = {m.Branch: {'domain_ids': ('domains', m.CareerDomain), 'role_ids': ('roles', m.CareerRole)},
             m.CareerDomain: {'related_role_ids': ('related_roles', m.CareerRole)}}


def fail(message, status=400, **extra):
    raise HTTPException(status, detail={'message': message, **extra})


def all_rows(db, model):
    return list(db.scalars(select(model).order_by(model.sort_order, model.created_at, model.id)).unique())


def get_row(db, model, row_id, *, lock=False):
    query = select(model).where(model.id == str(row_id))
    if lock:
        query = query.with_for_update()
    row = db.scalar(query)
    if row is None:
        fail('This record was not found.', 404)
    return row


def serialize(row):
    result = {column.name: getattr(row, column.name) for column in row.__table__.columns if column.name != 'seed_key'}
    for key, (attribute, _) in RELATIONS.get(type(row), {}).items():
        result[key] = [item.id for item in getattr(row, attribute)]
    return result


def dependencies(db, row):
    result = []
    for key, (model, _) in RESOURCES.items():
        parent = PARENTS.get(model)
        if parent and parent[1] is type(row):
            children = list(db.scalars(select(model).where(getattr(model, parent[0]) == row.id)))
            if children:
                result.append({'resource': key, 'total': len(children), 'published': sum(c.status == 'published' for c in children)})
    return result


def check_version(row, expected):
    if expected is not None and row.updated_at != expected:
        fail('This record changed since you opened it. Reload it before saving.', 409)


def check_publish(db, row):
    required = {
        m.Branch: ['description'], m.Subject: ['name'], m.ReferenceBook: ['authors', 'category'],
        m.Lab: ['name'], m.Experiment: ['objective', 'theory', 'apparatus', 'procedure', 'expected_result', 'precautions'],
        m.CareerDomain: ['summary', 'description', 'what_you_do', 'core_skills', 'useful_subjects', 'roadmap'],
        m.CareerRole: ['summary', 'description', 'responsibilities', 'skills', 'useful_subjects', 'roadmap', 'example_projects'],
        m.SiteContent: ['title', 'content_json'],
    }.get(type(row), [])
    missing = [field for field in required if not getattr(row, field)]
    if isinstance(row, m.ReferenceBook) and row.availability == 'available' and not row.resource_url:
        missing.append('resource_url')
    if isinstance(row, m.Experiment) and row.video_type and not row.video_url:
        missing.append('video_url')
    if isinstance(row, m.SiteContent):
        fields = ['intro', 'why', 'goal'] if row.key == 'about' else ['description', 'cards']
        missing.extend(f'content_json.{field}' for field in fields if not row.content_json.get(field))
    if missing:
        fail('Complete the required content before publishing.', fields=missing)
    current = row
    while type(current) in PARENTS:
        field, parent_type = PARENTS[type(current)]
        parent_id = getattr(current, field)
        if parent_id is None:
            break
        # Lock parents so publishing cannot race an archive of the same hierarchy.
        current = get_row(db, parent_type, parent_id, lock=True)
        if current.status != 'published':
            fail('Publish the parent content first.', 409)


def save(db, model, body, row=None):
    values = body.model_dump(mode='json', exclude={'expected_updated_at'})
    if row:
        check_version(row, body.expected_updated_at)
        if row.status == 'published' and values['status'] != 'published':
            deps = dependencies(db, row)
            if any(item['published'] for item in deps):
                fail('Unpublish or archive the published child records first.', 409, dependencies=deps)
    else:
        row = model()
        db.add(row)
    with db.no_autoflush:
        relations = RELATIONS.get(model, {})
        for key, value in values.items():
            if key in relations:
                attribute, relation_model = relations[key]
                setattr(row, attribute, [get_row(db, relation_model, ref) for ref in dict.fromkeys(value)])
            else:
                setattr(row, key, value)
        if model in PARENTS:
            field, parent = PARENTS[model]
            if getattr(row, field):
                get_row(db, parent, getattr(row, field))
        if row.status == 'published':
            check_publish(db, row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        fail('A matching record already exists or a related record is unavailable.', 409)
    db.refresh(row)
    return row


def change_status(db, row, body):
    schema = next(schema for model, schema in RESOURCES.values() if model is type(row))
    values = serialize(row)
    for field in ('id', 'created_at', 'updated_at'):
        values.pop(field, None)
    values['status'] = body.status
    values['expected_updated_at'] = body.expected_updated_at
    return save(db, type(row), schema.model_validate(values), row)


def remove_draft(db, row):
    if row.status != 'draft':
        fail('Only draft content can be deleted. Unpublish it first.', 409)
    if dependencies(db, row):
        fail('Remove related content before deleting this draft.', 409)
    db.delete(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        fail('This record is still in use and cannot be deleted.', 409)
    return {'success': True}


def published_rows(db):
    result = {}
    for key in ('branches', 'semesters', 'subjects', 'books', 'labs', 'experiments', 'career-domains', 'career-roles', 'site-content', 'rooms', 'faculty-subjects', 'faculty', 'career-resources'):
        model, _ = RESOURCES[key]
        rows = list(db.scalars(select(model).where(model.status == 'published').order_by(model.sort_order, model.created_at, model.id)).unique())
        if model in PARENTS:
            field, parent_model = PARENTS[model]
            parent_key = next(k for k, (t, _) in RESOURCES.items() if t is parent_model)
            visible_parents = {item.id for item in result[parent_key]}
            rows = [row for row in rows if getattr(row, field) is None or getattr(row, field) in visible_parents]
        result[key] = rows
    return result


def public_records(collection, key):
    records = [serialize(row) for row in collection[key]]
    domain_ids = {row.id for row in collection['career-domains']}
    role_ids = {row.id for row in collection['career-roles']}
    for row in records:
        if 'domain_ids' in row:
            row['domain_ids'] = [ref for ref in row['domain_ids'] if ref in domain_ids]
        for field in ('role_ids', 'related_role_ids'):
            if field in row:
                row[field] = [ref for ref in row[field] if ref in role_ids]
    return records
