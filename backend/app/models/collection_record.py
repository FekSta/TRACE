"""
CollectionRecord entity — Supporting Layer.

Records successful collection of recovered items.

See: assets/diagrams/data-model.md § 9. CollectionRecord
"""

import uuid
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class CollectionRecord(Base):
    """
    Record of an item being collected by its owner.

    Created when a verified claim is approved and the item is physically
    handed over to the claimant.

    Attributes:
        id: Primary key (UUID)
        claim_id: FK → Claim
        collected_by: Name/description of person collecting
        officer_id: FK → User — officer releasing the item
        collection_date: Date/time of collection
        recipient_signature: Signature reference (URL or identifier)
        remarks: Additional notes
    """

    __tablename__ = "collection_record"

    id: Mapped[uuid.UUID] = mapped_column(
        "collection_id",
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
    collected_by: Mapped[str] = mapped_column(String(200), nullable=False)
    officer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    collection_date: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    recipient_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
