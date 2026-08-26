"""
Attachment entity — Supporting Layer.

Stores uploaded images and supporting documents for items and claims.

See: Entities.md § 10. Attachment
"""

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import RelatedEntity, RelatedEntityType


class Attachment(Base):
    """
    Uploaded image or document linked to an item or claim.

    Only the file URL/path is stored; actual file bytes live on disk
    (Phase 1) or in Supabase Storage (Phase 2).

    Attributes:
        id: Primary key (integer, auto-increment)
        file_name: Original filename
        file_path: Storage path (relative URL)
        file_type: MIME type or extension (e.g. "image/jpeg", "application/pdf")
        uploaded_by: FK → User — who uploaded the file
        uploaded_at: Upload timestamp
        related_entity: LostItem, FoundItem, or Claim
        entity_id: ID of the related entity (polymorphic link)
    """

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    related_entity: Mapped[RelatedEntity] = mapped_column(RelatedEntityType, nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    uploader: Mapped["User"] = relationship(back_populates="attachments")
