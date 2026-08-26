"""
Notification entity — Supporting Layer.

Stores notifications sent to users for matches, claims, and workflow updates.

See: Entities.md § 7. Notification
"""

from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import NotificationType, NotificationTypeType


class Notification(Base):
    """
    A single notification delivered to a user.

    Created for match alerts, claim updates, collection reminders,
    and general system messages.

    Attributes:
        id: Primary key (integer, auto-increment)
        user_id: FK → User — recipient
        title: Notification title
        message: Notification content (nullable)
        notification_type: Match, Claim, Reminder, or System
        is_read: Whether the user has read it
        created_at: Date created
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notification_type: Mapped[NotificationType] = mapped_column(
        NotificationTypeType, default=NotificationType.SYSTEM
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notifications")
