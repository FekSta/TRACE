"""
LostItem entity — Core Business Layer.

Stores reports of items that users have lost.

See: assets/diagrams/data-model.md § 2. LostItem
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class LostItemStatus(str, enum.Enum):
    """Lost item lifecycle statuses."""
    Reported = "Reported"
    Matched = "Matched"
    Claimed = "Claimed"
    Closed = "Closed"


class LostItem(Base):
    """
    Lost item report submitted by a user.

    Attributes:
        id: Primary key (UUID)
        user_id: FK → User — who reported the item
        category_id: FK → Category — item classification
        title: Short item title
        description: Detailed description
        brand: Item manufacturer or brand
        colour: Item colour
        date_lost: Date item was lost
        location_lost: Last known location
        status: Reported, Matched, Claimed, or Closed
        created_at: Report creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "lost_item"

    id: Mapped[uuid.UUID] = mapped_column(
        "lost_item_id",
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
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("category.category_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    colour: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_lost: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    location_lost: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[LostItemStatus] = mapped_column(
        Enum(LostItemStatus), nullable=False, default=LostItemStatus.Reported
    )
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
