"""
Match entity — Supporting Layer.

Stores potential matches generated automatically by the matching algorithm.

See: Entities.md § 6. Match
"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, Numeric, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import MatchStatus, MatchStatusType


class Match(Base):
    """
    Potential match between a lost item and a found item.

    Generated automatically by the matching algorithm based on category,
    location, date proximity, and description similarity scoring.

    Attributes:
        id: Primary key (integer, auto-increment)
        lost_item_id: FK → LostItem
        found_item_id: FK → FoundItem
        match_score: Confidence score (0.00–999.99)
        match_reason: Human-readable reason for the match
        status: Suggested, Accepted, or Rejected
        generated_at: Date/time the match was generated
    """

    __tablename__ = "matches"

    __table_args__ = (
        UniqueConstraint("lost_item_id", "found_item_id",
                         name="uq_matches_lost_item_found_item"),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    lost_item_id: Mapped[int] = mapped_column(ForeignKey("lost_items.id", ondelete="CASCADE"), index=True)
    found_item_id: Mapped[int] = mapped_column(ForeignKey("found_items.id", ondelete="CASCADE"), index=True)
    match_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    match_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[MatchStatus] = mapped_column(MatchStatusType, default=MatchStatus.SUGGESTED)
    generated_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    lost_item: Mapped["LostItem"] = relationship(back_populates="matches")
    found_item: Mapped["FoundItem"] = relationship(back_populates="matches")
