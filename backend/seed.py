"""Seed script — Module 1: starter categories.

Idempotent: re-running is safe (upsert by name). Run from ``backend/``:

    cd backend
    DATABASE_URL=postgresql+psycopg://trace:trace_local_password@localhost:5432/trace \\
        .venv/bin/python seed.py

Without ``DATABASE_URL`` it falls back to the local dev default
(``postgresql+psycopg://trace:trace_local_password@localhost:5432/trace``).
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Category
from app.models.enums import CategoryStatus

DEFAULT_URL = "postgresql+psycopg://trace:trace_local_password@localhost:5432/trace"

# Exact names from `assets/diagrams/data-flow.md` ("Maintain Categories").
STARTER_CATEGORIES = [
    {
        "name": "Electronics",
        "description": "Electronic devices and accessories",
        "icon": "electronics",
        "display_order": 1,
    },
    {
        "name": "Bags",
        "description": "Bags, backpacks, wallets and luggage",
        "icon": "bags",
        "display_order": 2,
    },
    {
        "name": "Clothes",
        "description": "Clothing and wearable items",
        "icon": "clothes",
        "display_order": 3,
    },
    {
        "name": "Documents & Cards",
        "description": "Identity documents, cards and paperwork",
        "icon": "documents",
        "display_order": 4,
    },
]


def main() -> None:
    url = os.environ.get("DATABASE_URL", DEFAULT_URL)
    engine = create_engine(url)
    with Session(engine) as session:
        for cat in STARTER_CATEGORIES:
            existing = session.scalar(
                select(Category).where(Category.category_name == cat["name"])
            )
            if existing is not None:
                print(f"  exists:   {cat['name']}")
                continue
            session.add(
                Category(
                    category_name=cat["name"],
                    description=cat["description"],
                    icon=cat["icon"],
                    display_order=cat["display_order"],
                    status=CategoryStatus.ACTIVE,
                )
            )
            print(f"  inserted: {cat['name']}")
        session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    main()
