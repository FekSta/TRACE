"""
Notification entity — Supporting Layer.

Stores notifications sent to users for matches, claims, and workflow updates.

See: assets/diagrams/data-model.md § 7. Notification
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class NotificationType(str, enum.Enum):
    """Types of notifications sent to users."""
    Match = "Match"
    Claim = "Claim"
    Reminder = "Reminder"
    System = "System"


class Notification(Base):
    """
    A single notification delivered to a user.

    Created for match alerts, claim updates, collection reminders,
    and general system messages.

    Attributes:
        id: Primary key (UUID)
        user_id: FK → User — recipient
        title: Notification title
        message: Notification content
        notification_type: Match, Claim, Reminder, or System
        is_read: Whether the user has read it
        created_at: Date created
    """

    __tablename__ = "notification"

    id: Mapped[uuid.UUID] = mapped_column(
        "notification_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False, default=NotificationType.System
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
