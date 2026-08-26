"""
Claim entity — Core Business Layer.

Represents ownership claims submitted by users for found items.

See: Entities.md § 4. Claim
"""

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import (
    ClaimStatus,
    ClaimStatusType,
    ClaimVerificationStatus,
    ClaimVerificationStatusType,
)


class Claim(Base):
    """
    Ownership claim submitted by a user for a found item.

    Attributes:
        id: Primary key (integer, auto-increment)
        lost_item_id: FK → LostItem — related lost item (nullable)
        found_item_id: FK → FoundItem — related found item (nullable)
        user_id: FK → User — user submitting the claim
        claim_date: Date submitted
        verification_status: Pending, Approved, or Rejected
        officer_id: FK → User — officer reviewing the claim (nullable)
        verification_notes: Officer remarks
        collection_date: Date item was collected
        status: Active, Completed, or Cancelled
    """

    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    lost_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("lost_items.id", ondelete="SET NULL"), nullable=True, index=True
    )
    found_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("found_items.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    claim_date: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    verification_status: Mapped[ClaimVerificationStatus] = mapped_column(
        ClaimVerificationStatusType, default=ClaimVerificationStatus.PENDING
    )
    officer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    collection_date: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[ClaimStatus] = mapped_column(ClaimStatusType, default=ClaimStatus.ACTIVE)

    # Relationships
    lost_item: Mapped["LostItem"] = relationship(back_populates="claims")
    found_item: Mapped["FoundItem"] = relationship(back_populates="claims")
    user: Mapped["User"] = relationship(
        back_populates="claims_submitted", foreign_keys=[user_id]
    )
    officer: Mapped["User | None"] = relationship(
        back_populates="claims_reviewed", foreign_keys=[officer_id]
    )
    verification_records: Mapped[list["VerificationRecord"]] = relationship(
        back_populates="claim"
    )
    collection_records: Mapped[list["CollectionRecord"]] = relationship(
        back_populates="claim"
    )
