"""Student reports with OTP-issued identity and agent moderation."""
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import Field
from sqlalchemy import func, select

from student_session import current as current_student
from .models import ProblemReaction, StudentProblem, utcnow
from .repository import fail
from .schemas import Input


class ProblemInput(Input):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=3000)
    academic_level: Literal['P1', 'E1']
    priority: Literal['low', 'medium', 'high'] = 'medium'
    category: Literal['Academic', 'Hostel', 'Mess', 'Infrastructure', 'Internet', 'Transport', 'Other'] | None = None


class ReactionInput(Input):
    reaction: Literal['like', 'dislike']


class AgentProblemInput(Input):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=3000)
    academic_level: Literal['P1', 'E1']
    priority: Literal['low', 'medium', 'high']
    category: Literal['Academic', 'Hostel', 'Mess', 'Infrastructure', 'Internet', 'Transport', 'Other'] | None = None
    status: Literal['open', 'in_progress', 'resolved', 'archived']


def install_problems(app, settings):
    get_db = app.state.cms_get_db
    security = app.state.admin_security
    router = APIRouter(tags=['Student problems'])

    def student(request: Request):
        if request.headers.get('origin') != settings.frontend_url or request.headers.get('x-pivot-student') != '1':
            fail('This student request is not allowed.', 403)
        identity = current_student(request, settings.otp_secret)
        if not identity:
            fail('Verify your email again before reporting or voting.', 401)
        return identity

    def get_problem(db, problem_id: UUID, *, include_archived=False):
        row = db.get(StudentProblem, str(problem_id))
        if row is None or (row.status == 'archived' and not include_archived):
            fail('This report is unavailable.', 404)
        return row

    def render(db, row):
        likes = db.scalar(select(func.count()).select_from(ProblemReaction).where(
            ProblemReaction.problem_id == row.id, ProblemReaction.reaction == 'like')) or 0
        dislikes = db.scalar(select(func.count()).select_from(ProblemReaction).where(
            ProblemReaction.problem_id == row.id, ProblemReaction.reaction == 'dislike')) or 0
        return dict(id=row.id, title=row.title, description=row.description,
                    academic_level=row.academic_level, category=row.category, priority=row.priority,
                    status=row.status, created_at=row.created_at, updated_at=row.updated_at,
                    likes=likes, dislikes=dislikes)

    @router.get('/api/public/problems')
    def listing(level: Literal['P1', 'E1'] | None = None,
                priority: Literal['low', 'medium', 'high'] | None = None,
                status: Literal['open', 'in_progress', 'resolved'] | None = None,
                category: str | None = None,
                sort: Literal['trending', 'newest', 'priority'] = 'trending', db=Depends(get_db)):
        query = select(StudentProblem).where(StudentProblem.status != 'archived')
        if level: query = query.where(StudentProblem.academic_level == level)
        if priority: query = query.where(StudentProblem.priority == priority)
        if status: query = query.where(StudentProblem.status == status)
        if category: query = query.where(StudentProblem.category == category)
        items = [render(db, row) for row in db.scalars(query)]
        weight = {'low': 0, 'medium': 10, 'high': 20}
        if sort == 'trending':
            items.sort(key=lambda item: (weight[item['priority']] + item['likes'] - item['dislikes'],
                                         item['created_at'], item['id']), reverse=True)
        elif sort == 'priority':
            items.sort(key=lambda item: (weight[item['priority']], item['created_at'], item['id']), reverse=True)
        else:
            items.sort(key=lambda item: (item['created_at'], item['id']), reverse=True)
        return items[:200]

    @router.get('/api/public/problems/{problem_id}')
    def detail(problem_id: UUID, db=Depends(get_db)):
        return render(db, get_problem(db, problem_id))

    @router.post('/api/problems', status_code=201)
    def create(body: ProblemInput, identity=Depends(student), db=Depends(get_db)):
        recent = db.scalar(select(func.count()).select_from(StudentProblem).where(
            StudentProblem.author_identifier == identity,
            StudentProblem.created_at >= utcnow() - timedelta(hours=1))) or 0
        if recent >= 5:
            fail('Too many reports. Try again later.', 429)
        row = StudentProblem(**body.model_dump(), status='open', author_identifier=identity)
        db.add(row)
        db.commit()
        db.refresh(row)
        return render(db, row)

    @router.post('/api/problems/{problem_id}/reaction')
    def react(problem_id: UUID, body: ReactionInput, identity=Depends(student), db=Depends(get_db)):
        row = db.scalar(select(StudentProblem).where(StudentProblem.id == str(problem_id)).with_for_update())
        if row is None or row.status == 'archived':
            fail('This report is unavailable.', 404)
        existing = db.scalar(select(ProblemReaction).where(
            ProblemReaction.problem_id == row.id, ProblemReaction.student_identifier == identity))
        if existing and existing.reaction == body.reaction:
            db.delete(existing)
        elif existing:
            existing.reaction = body.reaction
        else:
            db.add(ProblemReaction(problem_id=row.id, student_identifier=identity, reaction=body.reaction))
        db.commit()
        return render(db, row)

    def agent(request: Request, db=Depends(get_db)):
        return security.session(request, db)[0]

    @router.get('/api/admin/problems', dependencies=[Depends(agent)])
    def admin_list(db=Depends(get_db)):
        return [render(db, row) for row in db.scalars(select(StudentProblem).order_by(StudentProblem.created_at.desc()))]

    @router.put('/api/admin/problems/{problem_id}', dependencies=[Depends(agent)])
    def admin_update(problem_id: UUID, body: AgentProblemInput, db=Depends(get_db)):
        row = get_problem(db, problem_id, include_archived=True)
        for key, value in body.model_dump().items():
            setattr(row, key, value)
        db.commit()
        db.refresh(row)
        return render(db, row)

    app.include_router(router)
