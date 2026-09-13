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


class ProfileUpdateRequest(BaseModel):
    """Self-service profile fields for ``PATCH /auth/me``.

    Deliberately excludes ``role`` and ``status``: a signed-in user may edit
    only their own personal details, and role changes stay an Administrator
    action (`/admin/users`). ``extra="forbid"`` turns any attempted ``role``
    (or other unknown field) into a 422 instead of a silent no-op, so
    privilege escalation through this route is impossible by construction.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=30)

    model_config = ConfigDict(extra="forbid")


class ChangePasswordRequest(BaseModel):
    """Self-service password change for ``POST /auth/me/password``.

    The caller must prove possession of the current password (a stolen token
    alone cannot rotate the password). The new password follows the same
    bcrypt 72-byte ceiling as registration. ``extra="forbid"`` keeps the
    payload surface minimal.
    """

    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    model_config = ConfigDict(extra="forbid")


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
