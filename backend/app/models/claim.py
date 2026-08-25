"""
Claim entity — Core Business Layer.

Represents ownership claims submitted by users for found items.

See: assets/diagrams/data-model.md § 4. Claim
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class VerificationStatus(str, enum.Enum):
    """Claim verification statuses."""
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"


class ClaimStatus(str, enum.Enum):
    """Claim lifecycle statuses."""
    Active = "Active"
    Completed = "Completed"
    Cancelled = "Cancelled"


class Claim(Base):
    """
    Ownership claim submitted by a user for a found item.

    Attributes:
        id: Primary key (UUID)
        lost_item_id: FK → LostItem — related lost item
        found_item_id: FK → FoundItem — related found item
        user_id: FK → User — user submitting the claim
        claim_date: Date submitted
        verification_status: Pending, Approved, or Rejected
        officer_id: FK → User — officer reviewing the claim (nullable)
        verification_notes: Officer remarks
        collection_date: Date item was collected
        status: Active, Completed, or Cancelled
    """

    __tablename__ = "claim"

    id: Mapped[uuid.UUID] = mapped_column(
        "claim_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    lost_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lost_item.lost_item_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    found_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("found_item.found_item_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_date: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), nullable=False, default=VerificationStatus.Pending
    )
    officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    collection_date: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ClaimStatus] = mapped_column(Enum(ClaimStatus), nullable=False, default=ClaimStatus.Active)
