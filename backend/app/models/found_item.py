"""
FoundItem entity — Core Business Layer.

Stores reports of items that have been found.

See: assets/diagrams/data-model.md § 3. FoundItem
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class FoundItemStatus(str, enum.Enum):
    """Found item lifecycle statuses."""
    Available = "Available"
    Claimed = "Claimed"
    Returned = "Returned"


class FoundItem(Base):
    """
    Found item report submitted by a user or officer.

    Attributes:
        id: Primary key (UUID)
        user_id: FK → User — who found the item
        category_id: FK → Category — item classification
        title: Short item title
        description: Detailed description
        brand: Manufacturer or brand
        colour: Item colour
        date_found: Date item was found
        storage_location: Where the item is stored
        status: Available, Claimed, or Returned
        created_at: Report creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "found_item"

    id: Mapped[uuid.UUID] = mapped_column(
        "found_item_id",
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
    date_found: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    storage_location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[FoundItemStatus] = mapped_column(
        Enum(FoundItemStatus), nullable=False, default=FoundItemStatus.Available
    )
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
