"""
VerificationRecord entity — Supporting Layer.

Maintains records of the ownership verification process.

See: Entities.md § 8. VerificationRecord
"""

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import VerificationResult, VerificationResultType


class VerificationRecord(Base):
    """
    Record of a single verification action by an Officer.

    Each verification record is tied to a Claim and tracks which Officer
    performed the check, the method used, and the outcome.

    Attributes:
        id: Primary key (integer, auto-increment)
        claim_id: FK → Claim
        officer_id: FK → User — officer performing verification
        verification_method: Method used (nullable)
        result: Passed or Failed
        notes: Verification notes
        verified_at: Verification timestamp
    """

    __tablename__ = "verification_records"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    officer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verification_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    result: Mapped[VerificationResult] = mapped_column(VerificationResultType, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    claim: Mapped["Claim"] = relationship(back_populates="verification_records")
    officer: Mapped["User"] = relationship(back_populates="verification_records")
