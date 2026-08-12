"""Attachment model — `assets/diagrams/data-model.md`, Supporting Layer, entity 10."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import RelatedEntity, RelatedEntityType


class Attachment(Base):
    """Stores uploaded images and supporting documents."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))  # FK: User (uploader)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    related_entity: Mapped[RelatedEntity] = mapped_column(RelatedEntityType)

    # Relationship.
    uploader: Mapped[User] = relationship(back_populates="attachments")
