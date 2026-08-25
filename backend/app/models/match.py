"""
Match entity — Supporting Layer.

Stores potential matches generated automatically by the matching algorithm.

See: assets/diagrams/data-model.md § 6. Match
"""

import enum
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class MatchStatus(str, enum.Enum):
    """Match lifecycle statuses."""
    Suggested = "Suggested"
    Accepted = "Accepted"
    Rejected = "Rejected"


class Match(Base):
    """
    Potential match between a lost item and a found item.

    Generated automatically by the matching algorithm based on category,
    location, date proximity, and description similarity scoring.

    Attributes:
        id: Primary key (UUID)
        lost_item_id: FK → LostItem
        found_item_id: FK → FoundItem
        match_score: Confidence score (0.0–1.0)
        match_reason: Human-readable reason for the match
        status: Suggested, Accepted, or Rejected
        generated_at: Date/time the match was generated
    """

    __tablename__ = "match"

    id: Mapped[uuid.UUID] = mapped_column(
        "match_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    lost_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lost_item.lost_item_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    found_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("found_item.found_item_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_score: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    match_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), nullable=False, default=MatchStatus.Suggested)
    generated_at: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
