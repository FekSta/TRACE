"""Notification model — `assets/diagrams/data-model.md`, Supporting Layer, entity 7."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import NotificationType, NotificationTypeType


class Notification(Base):
    """Stores notifications sent to users."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))  # FK: User (recipient)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str | None] = mapped_column(Text)
    notification_type: Mapped[NotificationType] = mapped_column(NotificationTypeType)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship (Entities.md: Notification → User, many-to-one).
    user: Mapped[User] = relationship(back_populates="notifications")
