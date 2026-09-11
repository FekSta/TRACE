"""Request/response schemas for Administrator account management."""

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole, UserStatus
from app.modules.auth.schemas import UserResponse


class AdminUserCreateRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    student_number: str | None = Field(default=None, max_length=50)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length=30)
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    # TODO(admin-user-management): remove client-supplied passwords after grading.
    password: str | None = Field(default=None, min_length=8, max_length=72)


class AdminUserUpdateRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    student_number: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=30)
    role: UserRole | None = None
    status: UserStatus | None = None


class AdminUserResponse(UserResponse):
    temporary_password: str | None = None