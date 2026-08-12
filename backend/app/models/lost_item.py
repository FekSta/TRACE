"""LostItem model — `assets/diagrams/data-model.md`, Core Business Layer, entity 2."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Identity, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import LostItemStatus, LostItemStatusType


class LostItem(Base):
    """Stores reports of items that users have lost."""

    __tablename__ = "lost_items"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))          # FK: User (reporter)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))  # FK: Category
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(String(100))
    colour: Mapped[str | None] = mapped_column(String(50))
    date_lost: Mapped[date | None] = mapped_column(Date)
    location_lost: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[LostItemStatus] = mapped_column(
        LostItemStatusType, default=LostItemStatus.REPORTED
    )

    # Relationships (Entities.md: User → LostItem one-to-many, Category → Items).
    user: Mapped[User] = relationship(back_populates="lost_items")
    category: Mapped[Category] = relationship(back_populates="lost_items")
    matches: Mapped[list[Match]] = relationship(back_populates="lost_item")
    claims: Mapped[list[Claim]] = relationship(back_populates="lost_item")
