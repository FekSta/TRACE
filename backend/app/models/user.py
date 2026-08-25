"""
User entity — Core Business Layer.

Represents every person interacting with TRACE: students, staff,
Lost & Found Officers, and Administrators.

See: assets/diagrams/data-model.md § 1. User
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class Role(str, enum.Enum):
    """User roles in the TRACE system."""
    User = "User"
    Officer = "Officer"
    Administrator = "Administrator"


class UserStatus(str, enum.Enum):
    """Account status values."""
    Active = "Active"
    Suspended = "Suspended"
    Inactive = "Inactive"


class User(Base):
    """
    Represents every person interacting with the system.

    Attributes:
        id: Primary key (UUID)
        first_name: User's first name
        last_name: User's last name
        student_number: Student or employee number
        email: Login email address (unique)
        phone_number: Contact number
        password_hash: Encrypted password
        role: User, Officer, or Administrator
        status: Active, Suspended, or Inactive
        created_at: Account creation timestamp
    """

    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        "user_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    student_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.User)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), nullable=False, default=UserStatus.Active)
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
