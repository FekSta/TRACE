"""AuditLog model — `assets/diagrams/data-model.md`, Supporting Layer, entity 11."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class AuditLog(Base):
    """Maintains a complete audit trail of significant system events."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    # Nullable: system-initiated actions have no acting user (Review.md §3).
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # FK: User (actor)
    action: Mapped[str] = mapped_column(String(50))
    entity_name: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ip_address: Mapped[str | None] = mapped_column(String(50))

    # Relationship.
    user: Mapped[User | None] = relationship(back_populates="audit_logs")
