"""Category model — `assets/diagrams/data-model.md`, Core Business Layer, entity 5."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import CategoryStatus, CategoryStatusType


class Category(Base):
    """Defines the categories used to classify lost and found items."""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    category_name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))
    icon: Mapped[str | None] = mapped_column(String(100))
    display_order: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[CategoryStatus] = mapped_column(CategoryStatusType, default=CategoryStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships — the FKs live on the item tables (Entities.md).
    lost_items: Mapped[list[LostItem]] = relationship(back_populates="category")
    found_items: Mapped[list[FoundItem]] = relationship(back_populates="category")
