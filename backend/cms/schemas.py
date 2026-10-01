"""Bounded plain-text content schemas; HTML and executable URLs are never inputs."""
import re
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Status = Literal['draft', 'published', 'archived']
Level = Literal['Low', 'Moderate', 'High']
Category = Literal['Software', 'AI & Data', 'Hardware', 'Electronics', 'Infrastructure', 'Security', 'Core Engineering']
Slug = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20000)]
ListItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
TextList = Annotated[list[ListItem], Field(max_length=80)]
Ids = Annotated[list[UUID], Field(max_length=100)]


def safe_url(value):
    if not value:
        return None
    if value != value.strip() or re.search(r'[\\\x00-\x20]', value):
        raise ValueError('Enter a clean HTTPS URL.')
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Enter an HTTPS URL without credentials.')
    if len(value) > 2048:
        raise ValueError('URL is too long.')
    return value


def normalize_youtube(value):
    parsed = urlsplit(safe_url(value) or '')
    host = (parsed.hostname or '').lower()
    video_id = None
    if host in {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'}:
        if parsed.path == '/watch':
            video_id = parse_qs(parsed.query).get('v', [None])[0]
        elif re.fullmatch(r'/(embed|shorts)/[^/]+', parsed.path):
            video_id = parsed.path.rsplit('/', 1)[1]
    elif host == 'youtu.be' and parsed.path.count('/') == 1:
        video_id = parsed.path[1:]
    if not video_id or not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
        raise ValueError('Enter a valid YouTube watch or share URL.')
    return f'https://www.youtube.com/watch?v={video_id}'


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ContentInput(Input):
    status: Status = 'draft'
    sort_order: int = Field(default=0, ge=0, le=100000)
    expected_updated_at: datetime | None = None


class BranchInput(ContentInput):
    slug: Slug
    name: ShortText = Field(min_length=1, max_length=200)
    short_name: ShortText = Field(default='', max_length=30)
    description: LongText = ''
    areas: TextList = Field(default_factory=list)
    domain_ids: Ids = Field(default_factory=list)
    role_ids: Ids = Field(default_factory=list)

    @field_validator('slug')
    @classmethod
    def reserve_p1_curriculum(cls, value):
        if value == 'common':
            raise ValueError('The slug common is reserved for the P1 curriculum.')
        return value


class SemesterInput(ContentInput):
    academic_level: Literal['P1', 'E1']
    branch_id: UUID | None = None
    name: ShortText = Field(min_length=1, max_length=100)
    number: int = Field(ge=1, le=12)

    @model_validator(mode='after')
    def level_branch(self):
        if (self.academic_level == 'P1') != (self.branch_id is None):
            raise ValueError('P1 has no branch; E1 requires a branch.')
        return self


class SubjectInput(ContentInput):
    semester_id: UUID
    slug: Slug
    name: ShortText = Field(min_length=1, max_length=200)
    code: ShortText = Field(default='', max_length=50)
    description: LongText = ''


class BookInput(ContentInput):
    subject_id: UUID
    title: ShortText = Field(min_length=1)
    authors: TextList = Field(default_factory=list)
    category: ShortText = Field(default='Reference Book', max_length=100)
    edition: ShortText = Field(default='', max_length=100)
    publisher: ShortText = Field(default='', max_length=200)
    description: LongText = ''
    resource_url: str | None = None
    availability: Literal['available', 'coming_soon'] = 'coming_soon'
    _url = field_validator('resource_url')(safe_url)


class LabInput(ContentInput):
    semester_id: UUID
    slug: Slug
    name: ShortText = Field(min_length=1, max_length=200)
    description: LongText = ''


class ExperimentInput(ContentInput):
    lab_id: UUID
    slug: Slug
    title: ShortText = Field(min_length=1)
    experiment_number: int | None = Field(default=None, ge=1, le=10000)
    objective: LongText = ''
    theory: LongText = ''
    apparatus: TextList = Field(default_factory=list)
    procedure: TextList = Field(default_factory=list)
    expected_result: LongText = ''
    precautions: TextList = Field(default_factory=list)
    video_type: Literal['youtube', 'mp4', 'external'] | None = None
    video_url: str | None = None
    duration: ShortText = Field(default='', max_length=50)
    _url = field_validator('video_url')(safe_url)

    @model_validator(mode='after')
    def video(self):
        if self.video_url:
            if not self.video_type:
                raise ValueError('Select a video type.')
            if self.video_type == 'youtube':
                self.video_url = normalize_youtube(self.video_url)
            if self.video_type == 'mp4' and not urlsplit(self.video_url).path.lower().endswith('.mp4'):
                raise ValueError('An MP4 URL must point to an .mp4 file.')
        return self


class RoadmapStage(Input):
    title: ShortText = Field(min_length=1, max_length=120)
    description: LongText = Field(max_length=4000)


class DomainInput(ContentInput):
    slug: Slug
    name: ShortText = Field(min_length=1, max_length=200)
    short_name: ShortText = Field(default='', max_length=50)
    category: Category
    summary: LongText = Field(default='', max_length=1000)
    description: LongText = ''
    what_you_do: TextList = Field(default_factory=list)
    core_skills: TextList = Field(default_factory=list)
    supporting_skills: TextList = Field(default_factory=list)
    useful_subjects: TextList = Field(default_factory=list)
    tools: TextList = Field(default_factory=list)
    technologies: TextList = Field(default_factory=list)
    suitable_for: TextList = Field(default_factory=list)
    challenges: TextList = Field(default_factory=list)
    programming_level: Level = 'Moderate'
    mathematics_level: Level = 'Moderate'
    roadmap: list[RoadmapStage] = Field(default_factory=list, max_length=12)
    related_role_ids: Ids = Field(default_factory=list)


class RoleInput(ContentInput):
    slug: Slug
    name: ShortText = Field(min_length=1, max_length=200)
    domain_id: UUID
    summary: LongText = Field(default='', max_length=1000)
    description: LongText = ''
    responsibilities: TextList = Field(default_factory=list)
    skills: TextList = Field(default_factory=list)
    useful_subjects: TextList = Field(default_factory=list)
    tools: TextList = Field(default_factory=list)
    technologies: TextList = Field(default_factory=list)
    programming_level: Level = 'Moderate'
    mathematics_level: Level = 'Moderate'
    roadmap: list[RoadmapStage] = Field(default_factory=list, max_length=12)
    interview_topics: TextList = Field(default_factory=list)
    example_projects: TextList = Field(default_factory=list)


class AboutContent(Input):
    eyebrow: ShortText = ''
    intro: LongText = ''
    why_title: ShortText = ''
    why: list[RoadmapStage] = Field(default_factory=list, max_length=20)
    goal_title: ShortText = ''
    goal: LongText = ''


class ExploreCard(Input):
    path: Literal['/resources/books', '/resources/labs', '/careers/domains', '/careers/jobs']
    title: ShortText = Field(min_length=1)
    description: LongText = Field(max_length=1000)


class ExploreContent(Input):
    description: LongText = ''
    academic_title: ShortText = ''
    careers_title: ShortText = ''
    tools_title: ShortText = ''
    cards: list[ExploreCard] = Field(default_factory=list, max_length=4)

    @model_validator(mode='after')
    def unique_cards(self):
        if len({c.path for c in self.cards}) != len(self.cards):
            raise ValueError('Choose each section once.')
        return self


class SiteContentInput(ContentInput):
    key: Literal['about', 'explore']
    title: ShortText = Field(default='', max_length=200)
    content_json: dict

    @model_validator(mode='after')
    def structure(self):
        schema = AboutContent if self.key == 'about' else ExploreContent
        self.content_json = schema.model_validate(self.content_json).model_dump(mode='json')
        return self


class StatusInput(Input):
    status: Status
    expected_updated_at: datetime | None = None


class ContentResponse(BaseModel):
    id: UUID
    status: Status
    sort_order: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(extra='allow')
