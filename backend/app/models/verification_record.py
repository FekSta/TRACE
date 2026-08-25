"""
VerificationRecord entity — Supporting Layer.

Maintains records of the ownership verification process.

See: assets/diagrams/data-model.md § 8. VerificationRecord
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class VerificationResult(str, enum.Enum):
    """Outcome of a verification check."""
    Passed = "Passed"
    Failed = "Failed"


class VerificationRecord(Base):
    """
    Record of a single verification action by an Officer.

    Each verification record is tied to a Claim and tracks which Officer
    performed the check, the method used, and the outcome.

    Attributes:
        id: Primary key (UUID)
        claim_id: FK → Claim
        officer_id: FK → User — officer performing verification
        verification_method: Method used (e.g. "document_check", "photo_match")
        result: Passed or Failed
        notes: Verification notes
        verified_at: Verification timestamp
    """

    __tablename__ = "verification_record"

    id: Mapped[uuid.UUID] = mapped_column(
        "verification_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claim.claim_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    verification_method: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[VerificationResult] = mapped_column(Enum(VerificationResult), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
