from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, Table, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Identity:
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now(), onupdate=utcnow)


class Content(Identity, Timestamps):
    status: Mapped[str] = mapped_column(String(16), default='draft', server_default='draft', index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default='0')


def status_check(table):
    return CheckConstraint("status IN ('draft','published','archived')", name=f'ck_{table}_status')


class Admin(Identity, Timestamps, Base):
    __tablename__ = 'admins'
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(String(100), default='Admin')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text('true'))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminSession(Identity, Base):
    __tablename__ = 'admin_sessions'
    admin_id: Mapped[str] = mapped_column(ForeignKey('admins.id', ondelete='RESTRICT'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StudentSession(Identity, Base):
    __tablename__ = 'student_sessions'
    __table_args__ = (CheckConstraint("academic_level IS NULL OR academic_level IN ('P1','E1')", name='ck_student_session_level'),)
    student_email: Mapped[str] = mapped_column(String(254), index=True)
    student_name: Mapped[str | None] = mapped_column(String(120))
    student_id: Mapped[str | None] = mapped_column(String(40))
    academic_level: Mapped[str | None] = mapped_column(String(2))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminChallenge(Identity, Base):
    __tablename__ = 'admin_challenges'
    admin_id: Mapped[str] = mapped_column(ForeignKey('admins.id', ondelete='RESTRICT'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    otp_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AdminThrottle(Base):
    __tablename__ = 'admin_auth_throttles'
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)


branch_domains = Table('branch_domains', Base.metadata,
    Column('branch_id', ForeignKey('branches.id', ondelete='RESTRICT'), primary_key=True),
    Column('domain_id', ForeignKey('career_domains.id', ondelete='RESTRICT'), primary_key=True))
branch_roles = Table('branch_roles', Base.metadata,
    Column('branch_id', ForeignKey('branches.id', ondelete='RESTRICT'), primary_key=True),
    Column('role_id', ForeignKey('career_roles.id', ondelete='RESTRICT'), primary_key=True))
domain_roles = Table('domain_related_roles', Base.metadata,
    Column('domain_id', ForeignKey('career_domains.id', ondelete='RESTRICT'), primary_key=True),
    Column('role_id', ForeignKey('career_roles.id', ondelete='RESTRICT'), primary_key=True))


class Branch(Content, Base):
    __tablename__ = 'branches'
    __table_args__ = (status_check('branches'),)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    short_name: Mapped[str] = mapped_column(String(30), default='')
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default='')
    areas: Mapped[list] = mapped_column(JSONB, default=list)
    domains: Mapped[list['CareerDomain']] = relationship(secondary=branch_domains, lazy='selectin')
    roles: Mapped[list['CareerRole']] = relationship(secondary=branch_roles, lazy='selectin')


class Semester(Content, Base):
    __tablename__ = 'semesters'
    __table_args__ = (status_check('semesters'),
        CheckConstraint("academic_level IN ('P1','E1')", name='ck_semester_level'),
        CheckConstraint("(academic_level='P1' AND branch_id IS NULL) OR (academic_level='E1' AND branch_id IS NOT NULL)", name='ck_semester_branch'),
        CheckConstraint('number BETWEEN 1 AND 12', name='ck_semester_number'),
        Index('uq_semester_p1', 'academic_level', 'number', unique=True, postgresql_where=text('branch_id IS NULL')),
        UniqueConstraint('branch_id', 'number', name='uq_semester_branch_number'))
    academic_level: Mapped[str] = mapped_column(String(2), index=True)
    branch_id: Mapped[str | None] = mapped_column(ForeignKey('branches.id', ondelete='RESTRICT'), index=True)
    name: Mapped[str] = mapped_column(String(100))
    number: Mapped[int] = mapped_column(Integer)


class Subject(Content, Base):
    __tablename__ = 'subjects'
    __table_args__ = (status_check('subjects'), UniqueConstraint('semester_id', 'slug', name='uq_subject_semester_slug'))
    semester_id: Mapped[str] = mapped_column(ForeignKey('semesters.id', ondelete='RESTRICT'), index=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    code: Mapped[str] = mapped_column(String(50), default='')
    description: Mapped[str] = mapped_column(Text, default='')


class ReferenceBook(Content, Base):
    __tablename__ = 'reference_books'
    __table_args__ = (status_check('reference_books'), CheckConstraint("availability IN ('coming_soon','available')", name='ck_book_availability'))
    subject_id: Mapped[str] = mapped_column(ForeignKey('subjects.id', ondelete='RESTRICT'), index=True)
    title: Mapped[str] = mapped_column(String(300))
    authors: Mapped[list] = mapped_column(JSONB, default=list)
    category: Mapped[str] = mapped_column(String(100), default='Reference Book')
    edition: Mapped[str] = mapped_column(String(100), default='')
    publisher: Mapped[str] = mapped_column(String(200), default='')
    description: Mapped[str] = mapped_column(Text, default='')
    resource_url: Mapped[str | None] = mapped_column(Text)
    availability: Mapped[str] = mapped_column(String(20), default='coming_soon')
    seed_key: Mapped[str | None] = mapped_column(String(200), unique=True)


class Lab(Content, Base):
    __tablename__ = 'labs'
    __table_args__ = (status_check('labs'), UniqueConstraint('semester_id', 'slug', name='uq_lab_semester_slug'))
    semester_id: Mapped[str] = mapped_column(ForeignKey('semesters.id', ondelete='RESTRICT'), index=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str] = mapped_column(Text, default='')


class Experiment(Content, Base):
    __tablename__ = 'experiments'
    __table_args__ = (status_check('experiments'), UniqueConstraint('lab_id', 'slug', name='uq_experiment_lab_slug'),
        CheckConstraint("video_type IS NULL OR video_type IN ('youtube','mp4','external')", name='ck_experiment_video'))
    lab_id: Mapped[str] = mapped_column(ForeignKey('labs.id', ondelete='RESTRICT'), index=True)
    title: Mapped[str] = mapped_column(String(300))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    experiment_number: Mapped[int | None] = mapped_column(Integer)
    objective: Mapped[str] = mapped_column(Text, default='')
    theory: Mapped[str] = mapped_column(Text, default='')
    apparatus: Mapped[list] = mapped_column(JSONB, default=list)
    procedure: Mapped[list] = mapped_column(JSONB, default=list)
    expected_result: Mapped[str] = mapped_column(Text, default='')
    precautions: Mapped[list] = mapped_column(JSONB, default=list)
    video_type: Mapped[str | None] = mapped_column(String(16))
    video_url: Mapped[str | None] = mapped_column(Text)
    duration: Mapped[str] = mapped_column(String(50), default='')


class CareerDomain(Content, Base):
    __tablename__ = 'career_domains'
    __table_args__ = (status_check('career_domains'),
        CheckConstraint("programming_level IN ('Low','Moderate','High')", name='ck_domain_programming'),
        CheckConstraint("mathematics_level IN ('Low','Moderate','High')", name='ck_domain_mathematics'))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    short_name: Mapped[str] = mapped_column(String(50), default='')
    category: Mapped[str] = mapped_column(String(50))
    summary: Mapped[str] = mapped_column(Text, default='')
    description: Mapped[str] = mapped_column(Text, default='')
    what_you_do: Mapped[list] = mapped_column(JSONB, default=list)
    core_skills: Mapped[list] = mapped_column(JSONB, default=list)
    supporting_skills: Mapped[list] = mapped_column(JSONB, default=list)
    useful_subjects: Mapped[list] = mapped_column(JSONB, default=list)
    tools: Mapped[list] = mapped_column(JSONB, default=list)
    technologies: Mapped[list] = mapped_column(JSONB, default=list)
    suitable_for: Mapped[list] = mapped_column(JSONB, default=list)
    challenges: Mapped[list] = mapped_column(JSONB, default=list)
    programming_level: Mapped[str] = mapped_column(String(10), default='Moderate')
    mathematics_level: Mapped[str] = mapped_column(String(10), default='Moderate')
    roadmap: Mapped[list] = mapped_column(JSONB, default=list)
    related_roles: Mapped[list['CareerRole']] = relationship(secondary=domain_roles, lazy='selectin')


class CareerRole(Content, Base):
    __tablename__ = 'career_roles'
    __table_args__ = (status_check('career_roles'),
        CheckConstraint("programming_level IN ('Low','Moderate','High')", name='ck_role_programming'),
        CheckConstraint("mathematics_level IN ('Low','Moderate','High')", name='ck_role_mathematics'))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    domain_id: Mapped[str] = mapped_column(ForeignKey('career_domains.id', ondelete='RESTRICT'), index=True)
    summary: Mapped[str] = mapped_column(Text, default='')
    description: Mapped[str] = mapped_column(Text, default='')
    responsibilities: Mapped[list] = mapped_column(JSONB, default=list)
    skills: Mapped[list] = mapped_column(JSONB, default=list)
    useful_subjects: Mapped[list] = mapped_column(JSONB, default=list)
    tools: Mapped[list] = mapped_column(JSONB, default=list)
    technologies: Mapped[list] = mapped_column(JSONB, default=list)
    programming_level: Mapped[str] = mapped_column(String(10), default='Moderate')
    mathematics_level: Mapped[str] = mapped_column(String(10), default='Moderate')
    roadmap: Mapped[list] = mapped_column(JSONB, default=list)
    interview_topics: Mapped[list] = mapped_column(JSONB, default=list)
    example_projects: Mapped[list] = mapped_column(JSONB, default=list)


class SiteContent(Content, Base):
    __tablename__ = 'site_content'
    __table_args__ = (status_check('site_content'),)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(200), default='')
    content_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class InformationRoom(Content, Base):
    __tablename__ = 'information_rooms'
    __table_args__ = (status_check('information_rooms'), UniqueConstraint('room_number', 'name', name='uq_room_number_name'))
    name: Mapped[str] = mapped_column(String(200))
    room_number: Mapped[str] = mapped_column(String(80))
    phone_number: Mapped[str] = mapped_column(String(32))
    floor: Mapped[str] = mapped_column(String(80), default='')
    description: Mapped[str] = mapped_column(Text, default='')


class FacultySubject(Content, Base):
    __tablename__ = 'faculty_subjects'
    __table_args__ = (status_check('faculty_subjects'),)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True)


class FacultyMember(Content, Base):
    __tablename__ = 'faculty_members'
    __table_args__ = (status_check('faculty_members'),)
    subject_id: Mapped[str] = mapped_column(ForeignKey('faculty_subjects.id', ondelete='RESTRICT'), index=True)
    name: Mapped[str] = mapped_column(String(200))
    designation: Mapped[str] = mapped_column(String(200), default='')
    mobile_number: Mapped[str] = mapped_column(String(32), default='')
    email: Mapped[str] = mapped_column(String(254), default='')
    room_number: Mapped[str] = mapped_column(String(80), default='')
    image_url: Mapped[str | None] = mapped_column(Text)


class CareerResource(Content, Base):
    __tablename__ = 'career_resources'
    __table_args__ = (status_check('career_resources'),
                      CheckConstraint("resource_type IN ('domain','job')", name='ck_career_resource_type'))
    resource_type: Mapped[str] = mapped_column(String(12), index=True)
    branch_id: Mapped[str] = mapped_column(ForeignKey('branches.id', ondelete='RESTRICT'), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default='')
    pdf_url: Mapped[str | None] = mapped_column(Text)
    supporting_url: Mapped[str | None] = mapped_column(Text)
    youtube_url: Mapped[str | None] = mapped_column(Text)
    storage_type: Mapped[str | None] = mapped_column(String(20))
    tags: Mapped[list] = mapped_column(JSONB, default=list)


class StudentProblem(Identity, Timestamps, Base):
    __tablename__ = 'student_problems'
    __table_args__ = (CheckConstraint("academic_level IN ('P1','E1')", name='ck_problem_academic_level'),
                      CheckConstraint("priority IN ('low','medium','high')", name='ck_problem_priority'),
                      CheckConstraint("status IN ('open','in_progress','resolved','archived')", name='ck_problem_status'),
                      Index('ix_student_problems_created_at', 'created_at'))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    academic_level: Mapped[str] = mapped_column(String(2), index=True)
    category: Mapped[str | None] = mapped_column(String(40))
    priority: Mapped[str] = mapped_column(String(10), index=True)
    status: Mapped[str] = mapped_column(String(16), default='open', server_default='open', index=True)
    author_identifier: Mapped[str] = mapped_column(String(64))


class ProblemReaction(Identity, Timestamps, Base):
    __tablename__ = 'problem_reactions'
    __table_args__ = (UniqueConstraint('problem_id', 'student_identifier', name='uq_problem_student_reaction'),
                      CheckConstraint("reaction IN ('like','dislike')", name='ck_problem_reaction'))
    problem_id: Mapped[str] = mapped_column(ForeignKey('student_problems.id', ondelete='RESTRICT'), index=True)
    student_identifier: Mapped[str] = mapped_column(String(64))
    reaction: Mapped[str] = mapped_column(String(8))
