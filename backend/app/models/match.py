"""Match model — `assets/diagrams/data-model.md`, Supporting Layer, entity 6."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Identity,
    Numeric,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import MatchStatus, MatchStatusType


class Match(Base):
    """Stores potential matches generated automatically by the matching engine."""

    __tablename__ = "matches"
    __table_args__ = (
        # One match per lost/found pair (interpretation recorded in Review.md).
        UniqueConstraint("lost_item_id", "found_item_id", name="uq_matches_lost_item_found_item"),
    )

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    lost_item_id: Mapped[int] = mapped_column(ForeignKey("lost_items.id"))   # FK: LostItem
    found_item_id: Mapped[int] = mapped_column(ForeignKey("found_items.id"))  # FK: FoundItem
    match_score: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    match_reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[MatchStatus] = mapped_column(MatchStatusType, default=MatchStatus.SUGGESTED)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships (Entities.md: LostItem ↔ FoundItem via Match join entity).
    lost_item: Mapped[LostItem] = relationship(back_populates="matches")
    found_item: Mapped[FoundItem] = relationship(back_populates="matches")
