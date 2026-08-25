"""
Attachment entity — Supporting Layer.

Stores uploaded images and supporting documents for items and claims.

See: assets/diagrams/data-model.md § 10. Attachment
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class RelatedEntity(str, enum.Enum):
    """Which entity this attachment is associated with."""
    LostItem = "LostItem"
    FoundItem = "FoundItem"
    Claim = "Claim"


class Attachment(Base):
    """
    Uploaded image or document linked to an item or claim.

    Only the file URL/path is stored; actual file bytes live on disk
    (Phase 1) or in Supabase Storage (Phase 2).

    Attributes:
        id: Primary key (UUID)
        file_name: Original filename
        file_path: Storage path (relative URL)
        file_type: MIME type or extension (e.g. "image/jpeg", "application/pdf")
        uploaded_by: FK → User — who uploaded the file
        uploaded_at: Upload timestamp
        related_entity: LostItem, FoundItem, or Claim
    """

    __tablename__ = "attachment"

    id: Mapped[uuid.UUID] = mapped_column(
        "attachment_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    uploaded_at: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    related_entity: Mapped[RelatedEntity] = mapped_column(Enum(RelatedEntity), nullable=False)
