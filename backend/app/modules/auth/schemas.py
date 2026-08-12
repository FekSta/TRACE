"""Pydantic schemas for the Auth module (Module 2).

`Role` / `Status` values match `assets/diagrams/data-model.md` exactly — the
schemas reuse the model enums, so the API cannot drift from the entities.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole, UserStatus


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    student_number: str | None = Field(default=None, max_length=50)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length=30)
    # max_length=72: bcrypt only uses the first 72 bytes (bcrypt 5.x raises
    # on longer input rather than silently truncating).
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    student_number: str | None
    email: EmailStr
    phone_number: str | None
    role: UserRole
    status: UserStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
