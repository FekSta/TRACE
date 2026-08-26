"""
User entity — Core Business Layer.

Represents every person interacting with TRACE: students, staff,
Lost & Found Officers, and Administrators.

See: Entities.md § 1. User
"""

from typing import Optional

from sqlalchemy import Boolean, DateTime, Identity, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import (
    UserRole,
    UserRoleType,
    UserStatus,
    UserStatusType,
)


class User(Base):
    """
    Represents every person interacting with the system.

    Attributes:
        id: Primary key (integer, auto-increment)
        first_name: User's first name
        last_name: User's last name
        student_number: Student or employee number
        email: Login email address (unique)
        phone_number: Contact number
        password_hash: Encrypted password
        role: User, Officer, or Administrator
        status: Active, Suspended, or Inactive
        is_verified: Whether the account is email-verified
        created_at: Account creation timestamp
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    student_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(UserRoleType, default=UserRole.USER)
    status: Mapped[UserStatus] = mapped_column(UserStatusType, default=UserStatus.ACTIVE)
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    lost_items: Mapped[list["LostItem"]] = relationship(back_populates="user")
    found_items: Mapped[list["FoundItem"]] = relationship(back_populates="user")
    claims_submitted: Mapped[list["Claim"]] = relationship(
        back_populates="user", foreign_keys="Claim.user_id"
    )
    claims_reviewed: Mapped[list["Claim"]] = relationship(
        back_populates="officer", foreign_keys="Claim.officer_id"
    )
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="uploader")
    verification_records: Mapped[list["VerificationRecord"]] = relationship(
        back_populates="officer"
    )
    collection_records: Mapped[list["CollectionRecord"]] = relationship(
        back_populates="officer"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
