from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator, model_validator


class SendOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class VerifyOtpRequest(SendOtpRequest):
    otp: Annotated[str, StringConstraints(strict=True, pattern=r"^[0-9]{6}$", min_length=6, max_length=6)]
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] | None = None
    student_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)] | None = None
    academic_level: Literal['P1', 'E1'] | None = None

    @model_validator(mode='after')
    def complete_profile(self):
        present = [self.name is not None, self.student_id is not None, self.academic_level is not None]
        if any(present) and not all(present):
            raise ValueError('Provide name, student ID and academic level together.')
        return self
