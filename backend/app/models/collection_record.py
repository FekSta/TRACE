"""
CollectionRecord entity — Supporting Layer.

Records successful collection of recovered items.

See: Entities.md § 9. CollectionRecord
"""

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class CollectionRecord(Base):
    """
    Record of an item being collected by its owner.

    Created when a verified claim is approved and the item is physically
    handed over to the claimant.

    Attributes:
        id: Primary key (integer, auto-increment)
        claim_id: FK → Claim
        collected_by: Name/description of person collecting (nullable)
        officer_id: FK → User — officer releasing the item
        collection_date: Date/time of collection
        recipient_signature: Signature reference (URL or identifier)
        remarks: Additional notes
    """

    __tablename__ = "collection_records"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    officer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    collection_date: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    recipient_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    claim: Mapped["Claim"] = relationship(back_populates="collection_records")
    officer: Mapped["User"] = relationship(back_populates="collection_records")
