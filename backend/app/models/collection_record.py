"""CollectionRecord model — `assets/diagrams/data-model.md`, Supporting Layer, entity 9."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CollectionRecord(Base):
    """Records the successful collection of recovered items."""

    __tablename__ = "collection_records"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id"))    # FK: Claim
    collected_by: Mapped[str | None] = mapped_column(String(200))
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))   # FK: User (officer)
    collection_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    recipient_signature: Mapped[str | None] = mapped_column(String(255))
    remarks: Mapped[str | None] = mapped_column(Text)

    # Relationships.
    claim: Mapped[Claim] = relationship(back_populates="collection_records")
    officer: Mapped[User] = relationship(back_populates="collection_records")
