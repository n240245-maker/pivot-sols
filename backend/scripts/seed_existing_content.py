"""Add missing seed records only. Never overwrite CMS edits or delete data."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import select
from cms.database import create_database_engine, session_factory
from cms import models as m


def seed(db, data):
    counts = {}
    created = set()
    def ensure(model, lookup, fields):
        row = db.scalar(select(model).filter_by(**lookup))
        if row:
            return row
        row = model(**lookup, **fields, status='published')
        db.add(row)
        db.flush()
        counts[model.__tablename__] = counts.get(model.__tablename__, 0) + 1
        created.add(row.id)
        return row

    branches = {b['id']: ensure(m.Branch, {'slug': b['id']}, {'name': b['name'], 'short_name': b.get('shortName',''),
        'description': b['overview'], 'areas': b['areas'], 'sort_order': i}) for i,b in enumerate(data['branches'])}
    semesters = {}
    for curriculum in data['books']['curricula']:
        branch = branches.get(curriculum['id'])
        for i,s in enumerate(curriculum['semesters']):
            semesters[(curriculum['id'], s['id'])] = ensure(m.Semester,
                {'academic_level': curriculum['level'], 'branch_id': branch.id if branch else None, 'number': s.get('number',i+1)},
                {'name': s['name'], 'sort_order': i})
    subjects = {}
    for i,s in enumerate(data['books']['subjects']):
        subjects[s['id']] = ensure(m.Subject, {'semester_id': semesters[(s['curriculumId'],s['semesterId'])].id, 'slug': s['slug']},
            {'name': s['name'], 'code': s.get('code',''), 'description': 'Imported prototype subject; confirm curriculum before replacing sample resources.', 'sort_order': i})
    for i,b in enumerate(data['books']['books']):
        ensure(m.ReferenceBook, {'seed_key': b['id']}, {'subject_id': subjects[b['subjectId']].id, 'title': b['title'],
            'authors': b['authors'], 'category': b.get('type','Reference Book'), 'edition': b.get('edition',''),
            'publisher': b.get('publisher',''), 'description': b.get('description',''), 'resource_url': b.get('resourceUrl'),
            'availability': 'available' if b.get('resourceUrl') else 'coming_soon', 'sort_order': i})
    for i,l in enumerate(data['labs']['labs']):
        lab = ensure(m.Lab, {'semester_id': semesters[(l['curriculumId'],l['semesterId'])].id, 'slug': l['slug']},
            {'name': l['name'], 'description': l.get('shortDescription',''), 'sort_order': i})
        for j,e in enumerate(l['experiments']):
            ensure(m.Experiment, {'lab_id': lab.id, 'slug': e['slug']}, {'title': e['title'], 'experiment_number': e.get('experimentNumber'),
                'objective': e.get('objective',''), 'theory': e.get('theory',''), 'apparatus': e.get('apparatus',[]),
                'procedure': e.get('procedure',[]), 'expected_result': e.get('expectedResult',''), 'precautions': e.get('precautions',[]),
                'video_type': e.get('videoType'), 'video_url': e.get('videoUrl'), 'duration': e.get('duration',''), 'sort_order': j})
    domains = {}
    for i,d in enumerate(data['domains']):
        domains[d['slug']] = ensure(m.CareerDomain, {'slug': d['slug']}, {'name': d['name'], 'category': d['category'],
            'summary': d['description'], 'description': d['overview'], 'what_you_do': d['work'], 'core_skills': d['skills'],
            'useful_subjects': d['subjects'], 'tools': d['tools'], 'suitable_for': d['interests'], 'roadmap': d['roadmap'],
            'programming_level': d['programming'], 'mathematics_level': d['mathematics'], 'sort_order': i})
    roles = {}
    for i,r in enumerate(data['roles']):
        roles[r['id']] = ensure(m.CareerRole, {'slug': r['slug']}, {'name': r['name'], 'domain_id': domains[r['domainSlug']].id,
            'summary': r['description'], 'description': r['description'], 'responsibilities': r['responsibilities'], 'skills': r['skills'],
            'useful_subjects': r['subjects'], 'tools': r['tools'], 'technologies': r['technologies'], 'roadmap': r['roadmap'],
            'interview_topics': r['interviewTopics'], 'example_projects': r['projects'],
            'programming_level': r['programming'], 'mathematics_level': r['mathematics'], 'sort_order': i})
    # Only populate associations on newly inserted records; preserve later CMS edits.
    for d in data['domains']:
        if domains[d['slug']].id in created:
            domains[d['slug']].related_roles = [roles[ref] for ref in d['roleIds']]
    for b in data['branches']:
        if branches[b['id']].id in created:
            branches[b['id']].domains = [domains[ref] for ref in b['domainSlugs']]
            branches[b['id']].roles = [roles[ref] for ref in b['roleIds']]
    for key, content in data['site'].items():
        ensure(m.SiteContent, {'key': key}, content)
    db.flush()
    return counts


def main():
    try:
        data = json.loads((Path(__file__).resolve().parents[1] / 'seed_content.json').read_text(encoding='utf-8'))
        with session_factory(create_database_engine())() as db:
            counts = seed(db, data)
            db.commit()
        print(json.dumps({'inserted': counts, 'total_inserted': sum(counts.values()), 'existing_records': 'preserved'}))
        return 0
    except Exception as exc:
        print(json.dumps({'seed': 'failed', 'error_type': type(exc).__name__, 'details': 'hidden; check migrations and seed input'}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
