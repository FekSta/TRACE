"""Claim model — `assets/diagrams/data-model.md`, Core Business Layer, entity 4."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import (
    ClaimStatus,
    ClaimStatusType,
    ClaimVerificationStatus,
    ClaimVerificationStatusType,
)


class Claim(Base):
    """Represents ownership claims submitted by users for found items."""

    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    lost_item_id: Mapped[int] = mapped_column(ForeignKey("lost_items.id"))   # FK: LostItem
    found_item_id: Mapped[int] = mapped_column(ForeignKey("found_items.id"))  # FK: FoundItem
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))             # FK: User (claimant)
    claim_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verification_status: Mapped[ClaimVerificationStatus] = mapped_column(
        ClaimVerificationStatusType, default=ClaimVerificationStatus.PENDING
    )
    officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))   # FK: User (officer)
    verification_notes: Mapped[str | None] = mapped_column(Text)
    collection_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[ClaimStatus] = mapped_column(ClaimStatusType, default=ClaimStatus.ACTIVE)

    # Relationships (Entities.md: User → Claim dual — claimants and officers).
    lost_item: Mapped[LostItem] = relationship(back_populates="claims")
    found_item: Mapped[FoundItem] = relationship(back_populates="claims")
    user: Mapped[User] = relationship(
        back_populates="claims_submitted", foreign_keys=[user_id]
    )
    officer: Mapped[User | None] = relationship(
        back_populates="claims_reviewed", foreign_keys=[officer_id]
    )
    verification_records: Mapped[list[VerificationRecord]] = relationship(
        back_populates="claim"
    )
    collection_records: Mapped[list[CollectionRecord]] = relationship(
        back_populates="claim"
    )
