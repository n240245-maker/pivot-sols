from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator


class SendOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class VerifyOtpRequest(SendOtpRequest):
    otp: Annotated[str, StringConstraints(strict=True, pattern=r"^[0-9]{6}$", min_length=6, max_length=6)]
