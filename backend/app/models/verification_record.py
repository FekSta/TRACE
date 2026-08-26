"""VerificationRecord model — `assets/diagrams/data-model.md`, Supporting Layer, entity 8."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import VerificationResult, VerificationResultType


class VerificationRecord(Base):
    """Maintains records of the ownership verification process."""

    __tablename__ = "verification_records"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id"))    # FK: Claim
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))   # FK: User (officer)
    verification_method: Mapped[str | None] = mapped_column(String(100))
    result: Mapped[VerificationResult] = mapped_column(VerificationResultType)
    notes: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships.
    claim: Mapped[Claim] = relationship(back_populates="verification_records")
    officer: Mapped[User] = relationship(back_populates="verification_records")
