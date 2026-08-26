"""
LostItem entity — Core Business Layer.

Stores reports of items that users have lost.

See: Entities.md § 2. LostItem
"""

from typing import Optional

from sqlalchemy import Date, ForeignKey, Identity, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import LostItemStatus, LostItemStatusType


class LostItem(Base):
    """
    Lost item report submitted by a user.

    Attributes:
        id: Primary key (integer, auto-increment)
        user_id: FK → User — who reported the item
        category_id: FK → Category — item classification
        title: Short item title
        description: Detailed description (nullable)
        brand: Item manufacturer or brand
        colour: Item colour
        date_lost: Date item was lost
        location_lost: Last known location (nullable)
        status: Reported, Matched, Claimed, or Closed
    """

    __tablename__ = "lost_items"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    colour: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_lost: Mapped[str] = mapped_column(Date, nullable=False)
    location_lost: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[LostItemStatus] = mapped_column(
        LostItemStatusType, default=LostItemStatus.REPORTED
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="lost_items")
    category: Mapped["Category"] = relationship(back_populates="lost_items")
    matches: Mapped[list["Match"]] = relationship(back_populates="lost_item")
    claims: Mapped[list["Claim"]] = relationship(back_populates="lost_item")
