from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator


class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=2, max_length=100)]
    email: EmailStr
    message: Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=10, max_length=3000)]

    @field_validator("name")
    @classmethod
    def safe_name(cls, value: str) -> str:
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("Name must not contain control characters.")
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("message")
    @classmethod
    def safe_message(cls, value: str) -> str:
        if any((ord(char) < 32 and char not in "\n\r\t") or ord(char) == 127 for char in value):
            raise ValueError("Message contains unsupported control characters.")
        return value
