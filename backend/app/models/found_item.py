"""
FoundItem entity — Core Business Layer.

Stores reports of items that have been found.

See: Entities.md § 3. FoundItem
"""

from typing import Optional

from sqlalchemy import Date, ForeignKey, Identity, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import FoundItemStatus, FoundItemStatusType


class FoundItem(Base):
    """
    Found item report submitted by a user or officer.

    Attributes:
        id: Primary key (integer, auto-increment)
        user_id: FK → User — who found the item
        category_id: FK → Category — item classification
        title: Short item title
        description: Detailed description (nullable)
        brand: Manufacturer or brand
        colour: Item colour
        date_found: Date item was found
        storage_location: Where the item is stored (nullable)
        status: Available, Claimed, or Returned
    """

    __tablename__ = "found_items"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    colour: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_found: Mapped[str] = mapped_column(Date, nullable=False)
    storage_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[FoundItemStatus] = mapped_column(
        FoundItemStatusType, default=FoundItemStatus.AVAILABLE
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="found_items")
    category: Mapped["Category"] = relationship(back_populates="found_items")
    matches: Mapped[list["Match"]] = relationship(back_populates="found_item")
    claims: Mapped[list["Claim"]] = relationship(back_populates="found_item")
