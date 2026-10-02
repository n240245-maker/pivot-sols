"""Input for self-declared student session creation."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator


class StudentLoginRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    student_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=40)]
    academic_level: Literal['P1', 'E1']

    @field_validator('name')
    @classmethod
    def valid_name(cls, value: str) -> str:
        normalized = ' '.join(value.split())
        if len(normalized) < 2 or not any(character.isalpha() for character in normalized):
            raise ValueError('Enter your name.')
        return normalized

    @field_validator('student_id')
    @classmethod
    def normalize_id(cls, value: str) -> str:
        normalized = value.upper()
        if not normalized.isascii() or not normalized.isalnum():
            raise ValueError('Enter a valid student ID.')
        return normalized
