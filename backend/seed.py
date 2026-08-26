"""
Seed script for TRACE database.

Seeds the Category table with the 4 starter categories defined in
Entities.md:

  1. Electronics
  2. Bags
  3. Clothes
  4. Documents & Cards

Usage:
  cd backend && python -m seed
  # or
  python -m backend.seed
"""

import sys
import os

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.models.category import Category
from backend.app.models.enums import CategoryStatus


STARTER_CATEGORIES = [
    {
        "category_name": "Electronics",
        "description": "Phones, laptops, tablets, headphones, chargers, and other electronic devices",
        "icon": "devices",
        "display_order": 1,
    },
    {
        "category_name": "Bags",
        "description": "Backpacks, handbags, briefcases, laptop bags, and travel bags",
        "icon": "bag",
        "display_order": 2,
    },
    {
        "category_name": "Clothes",
        "description": "Jackets, sweaters, scarves, hats, and other wearable items",
        "icon": "checkroom",
        "display_order": 3,
    },
    {
        "category_name": "Documents & Cards",
        "description": "IDs, student cards, bank cards, passports, and important documents",
        "icon": "credit_card",
        "display_order": 4,
    },
]


def seed_categories():
    """Insert starter categories if they don't already exist."""
    db = SessionLocal()
    try:
        added = 0
        for cat_data in STARTER_CATEGORIES:
            existing = db.execute(
                select(Category).where(Category.category_name == cat_data["category_name"])
            ).scalar_one_or_none()

            if existing is None:
                category = Category(
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    icon=cat_data["icon"],
                    display_order=cat_data["display_order"],
                    status=CategoryStatus.ACTIVE,
                )
                db.add(category)
                added += 1
                print(f"  ✓ Added category: {cat_data['category_name']}")
            else:
                print(f"  – Category already exists: {cat_data['category_name']}")

        db.commit()
        print(f"\nSeed complete. {added} new categories inserted.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding categories: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("TRACE Database Seed — Category Table")
    print("=" * 40)
    seed_categories()
