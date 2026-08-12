"""FoundItem model — `assets/diagrams/data-model.md`, Core Business Layer, entity 3."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Identity, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import FoundItemStatus, FoundItemStatusType


class FoundItem(Base):
    """Stores reports of items that have been found."""

    __tablename__ = "found_items"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))          # FK: User (finder)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))  # FK: Category
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(String(100))
    colour: Mapped[str | None] = mapped_column(String(50))
    date_found: Mapped[date | None] = mapped_column(Date)
    storage_location: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[FoundItemStatus] = mapped_column(
        FoundItemStatusType, default=FoundItemStatus.AVAILABLE
    )

    # Relationships (Entities.md: User → FoundItem one-to-many, Category → Items).
    user: Mapped[User] = relationship(back_populates="found_items")
    category: Mapped[Category] = relationship(back_populates="found_items")
    matches: Mapped[list[Match]] = relationship(back_populates="found_item")
    claims: Mapped[list[Claim]] = relationship(back_populates="found_item")
