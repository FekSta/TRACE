"""User model — `assets/diagrams/data-model.md`, Core Business Layer, entity 1."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Identity, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import UserRole, UserRoleType, UserStatus, UserStatusType


class User(Base):
    """Represents every person interacting with the system (students, staff,
    Lost & Found Officers, and Administrators)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    student_number: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone_number: Mapped[str | None] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(UserRoleType, default=UserRole.USER)
    status: Mapped[UserStatus] = mapped_column(UserStatusType, default=UserStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships — the FKs live on the child tables (Entities.md).
    lost_items: Mapped[list[LostItem]] = relationship(back_populates="user")
    found_items: Mapped[list[FoundItem]] = relationship(back_populates="user")
    claims_submitted: Mapped[list[Claim]] = relationship(
        back_populates="user", foreign_keys="Claim.user_id"
    )
    claims_reviewed: Mapped[list[Claim]] = relationship(
        back_populates="officer", foreign_keys="Claim.officer_id"
    )
    notifications: Mapped[list[Notification]] = relationship(back_populates="user")
    attachments: Mapped[list[Attachment]] = relationship(back_populates="uploader")
    verification_records: Mapped[list[VerificationRecord]] = relationship(
        back_populates="officer"
    )
    collection_records: Mapped[list[CollectionRecord]] = relationship(
        back_populates="officer"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(back_populates="user")
