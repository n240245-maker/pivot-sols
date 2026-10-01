"""Adapter preserves the current student routes and component data contracts."""
from .repository import published_rows


def build_catalog(db):
    rows = published_rows(db)
    branches = {b.id: b for b in rows['branches']}
    semesters = {s.id: s for s in rows['semesters']}
    domains = {d.id: d for d in rows['career-domains']}
    roles = {r.id: r for r in rows['career-roles']}
    curricula = {}
    for semester in semesters.values():
        branch = branches.get(semester.branch_id)
        key = branch.slug if branch else 'common'
        if key not in curricula:
            curricula[key] = {'id': key, 'level': semester.academic_level, 'semesters': []}
            if branch:
                curricula[key]['branch'] = {'id': branch.slug, 'name': branch.name, 'shortName': branch.short_name}
        curricula[key]['semesters'].append({'id': f'semester-{semester.number}', 'name': semester.name, 'number': semester.number})
    def academic(semester_id):
        semester = semesters[semester_id]
        branch = branches.get(semester.branch_id)
        return {'curriculumId': branch.slug if branch else 'common', 'semesterId': f'semester-{semester.number}'}

    subjects = [{'id': s.id, **academic(s.semester_id), 'name': s.name, 'slug': s.slug, 'code': s.code, 'description': s.description} for s in rows['subjects']]
    books = [{'id': b.id, 'subjectId': b.subject_id, 'title': b.title, 'authors': b.authors, 'type': b.category,
              'edition': b.edition, 'publisher': b.publisher, 'description': b.description,
              'resourceUrl': b.resource_url if b.availability == 'available' else None} for b in rows['books']]
    experiments = {}
    for e in rows['experiments']:
        experiments.setdefault(e.lab_id, []).append({'id': e.id, 'title': e.title, 'slug': e.slug,
            'experimentNumber': e.experiment_number, 'objective': e.objective, 'theory': e.theory,
            'apparatus': e.apparatus, 'procedure': e.procedure, 'expectedResult': e.expected_result, 'precautions': e.precautions,
            'videoType': e.video_type, 'videoUrl': e.video_url, 'duration': e.duration})
    labs = [{'id': l.id, **academic(l.semester_id), 'name': l.name, 'slug': l.slug, 'shortDescription': l.description,
             'experiments': experiments.get(l.id, [])} for l in rows['labs']]
    domain_data = [{'id': d.id, 'slug': d.slug, 'name': d.name, 'category': d.category, 'description': d.summary,
        'overview': d.description, 'work': d.what_you_do, 'skills': d.core_skills, 'subjects': d.useful_subjects,
        'tools': list(dict.fromkeys(d.tools + d.technologies)), 'supportingSkills': d.supporting_skills, 'challenges': d.challenges,
        'programming': d.programming_level, 'mathematics': d.mathematics_level, 'interests': d.suitable_for, 'roadmap': d.roadmap,
        'roleIds': list(dict.fromkeys([r.id for r in d.related_roles if r.id in roles] + [r.id for r in roles.values() if r.domain_id == d.id]))} for d in domains.values()]
    role_data = [{'id': r.id, 'slug': r.slug, 'name': r.name, 'domainSlug': domains[r.domain_id].slug, 'summary': r.summary,
        'description': r.description, 'responsibilities': r.responsibilities, 'skills': r.skills, 'subjects': r.useful_subjects,
        'tools': r.tools, 'technologies': r.technologies, 'programming': r.programming_level, 'mathematics': r.mathematics_level,
        'roadmap': r.roadmap, 'interviewTopics': r.interview_topics, 'projects': r.example_projects} for r in roles.values()]
    branch_data = [{'id': b.slug, 'name': b.name, 'shortName': b.short_name, 'overview': b.description, 'areas': b.areas,
        'domainSlugs': [d.slug for d in b.domains if d.id in domains], 'roleIds': [r.id for r in b.roles if r.id in roles]} for b in branches.values()]
    return {'books': {'demo': False, 'curricula': list(curricula.values()), 'subjects': subjects, 'books': books},
            'labs': {'demo': False, 'curricula': list(curricula.values()), 'labs': labs},
            'domains': domain_data, 'roles': role_data, 'branches': branch_data,
            'site': {s.key: {'title': s.title, **s.content_json} for s in rows['site-content']}}
