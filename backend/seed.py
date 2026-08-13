"""Seed script — demo kit (Module 1 categories + Module 8 demo data).

Idempotent: safe to run at every container start (the backend entrypoint
runs it), and re-running ``make demo`` never duplicates data.

What it seeds, in order:

1. **Categories (Module 1)** — upsert the 4 starter categories by name.
2. **Demo users (Module 8)** — one account per role with *documented*
   credentials (see `Tutorial.md` / `Notes.md`). Existing accounts are
   refreshed (password/role/status reset to the demo values) so the
   documented credentials always work, even after the stack was played with.
3. **Demo items (Module 8)** — a handful of LostItems/FoundItems including
   **two deliberately-matching pairs**. Item seeding only runs when *both*
   item tables are empty, so demo data is never duplicated on top of data
   created through the UI.
4. **Matching verification (Module 8)** — after inserting items the seed
   runs the **same matching pass the API uses**
   (``matching.service.run_matching_for_found_item``) and then *asserts*
   each expected pair produced a ``Suggested`` Match at/above
   ``MATCH_THRESHOLD``. If the Matching module ever regresses, seeding fails
   loudly instead of silently presenting a demo with no matches.

Run from ``backend/``:

    cd backend
    DATABASE_URL=postgresql+psycopg://trace:trace_local_password@localhost:5432/trace \
        .venv/bin/python seed.py

Without ``DATABASE_URL`` it falls back to the local dev default
(``postgresql+psycopg://trace:trace_local_password@localhost:5432/trace``).
"""

from __future__ import annotations

import os
from datetime import date

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models import Category, FoundItem, LostItem, Match, User
from app.models.enums import (
    CategoryStatus,
    FoundItemStatus,
    LostItemStatus,
    MatchStatus,
    UserRole,
    UserStatus,
)
from app.modules.auth.security import hash_password
from app.modules.matching.service import run_matching_for_found_item
from app.modules.matching.utils.similarity import MATCH_THRESHOLD

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

# One account per role with the exact credentials documented in Tutorial.md /
# Notes.md. `ada` reports the lost items, `bob` registers the found items,
# `officer` reviews claims, `admin` runs the portal.
DEMO_USERS = [
    {
        "email": "ada@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "student_number": "s1234567",
        "phone_number": "+27123456789",
        "password": "SuperSecret1!",
        "role": UserRole.USER,
    },
    {
        "email": "bob@example.com",
        "first_name": "Bob",
        "last_name": "Finder",
        "student_number": "s7654321",
        "phone_number": "+27987654321",
        "password": "SuperSecret1!",
        "role": UserRole.USER,
    },
    {
        "email": "officer@example.com",
        "first_name": "Officer",
        "last_name": "Trace",
        "student_number": None,
        "phone_number": None,
        "password": "TestPass123!",
        "role": UserRole.OFFICER,
    },
    {
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "Trace",
        "student_number": None,
        "phone_number": None,
        "password": "TestPass123!",
        "role": UserRole.ADMINISTRATOR,
    },
]

# Demo items. The backpack and the headphones are the *deliberately-matching
# pairs* — identical category/location/date/description, so they score 100.00
# and are guaranteed to clear the Module 4 threshold (60.00). Everything else
# is deliberately non-matching (different category or thin overlap), so a
# fresh demo shows exactly two `Suggested` matches.
DEMO_LOST_ITEMS = [
    {
        "title": "Black Nike backpack",
        "description": "Black Nike backpack with a silver laptop sleeve",
        "brand": "Nike",
        "colour": "Black",
        "date_lost": date(2026, 8, 10),
        "location_lost": "Library",
        "category_name": "Bags",
        "owner_email": "ada@example.com",
    },
    {
        "title": "Blue Sony headphones",
        "description": "Blue Sony wireless headphones with black carrying case",
        "brand": "Sony",
        "colour": "Blue",
        "date_lost": date(2026, 8, 12),
        "location_lost": "Library",
        "category_name": "Electronics",
        "owner_email": "ada@example.com",
    },
    {
        "title": "Silver laptop",
        "description": "Silver Dell laptop with a university sticker on the lid",
        "brand": "Dell",
        "colour": "Silver",
        "date_lost": date(2026, 8, 5),
        "location_lost": "Computer Science Building",
        "category_name": "Electronics",
        "owner_email": "ada@example.com",
    },
]

DEMO_FOUND_ITEMS = [
    {
        "title": "Black Nike backpack",
        "description": "Black Nike backpack with a silver laptop sleeve",
        "brand": "Nike",
        "colour": "Black",
        "date_found": date(2026, 8, 10),
        "storage_location": "Library",
        "category_name": "Bags",
        "finder_email": "bob@example.com",
    },
    {
        "title": "Blue Sony headphones",
        "description": "Blue Sony wireless headphones with black carrying case",
        "brand": "Sony",
        "colour": "Blue",
        "date_found": date(2026, 8, 12),
        "storage_location": "Library",
        "category_name": "Electronics",
        "finder_email": "bob@example.com",
    },
    {
        "title": "Red Nike jacket",
        "description": "Red Nike windbreaker jacket, size medium",
        "brand": "Nike",
        "colour": "Red",
        "date_found": date(2026, 8, 11),
        "storage_location": "Sports Centre",
        "category_name": "Clothes",
        "finder_email": "bob@example.com",
    },
]

# (lost title, found title) pairs that MUST exist as `Suggested` Matches at or
# above MATCH_THRESHOLD after seeding — the Module 3/4 regression check.
EXPECTED_MATCHING_PAIRS = [
    ("Black Nike backpack", "Black Nike backpack"),
    ("Blue Sony headphones", "Blue Sony headphones"),
]


def _seed_categories(session: Session) -> None:
    for cat in STARTER_CATEGORIES:
        existing = session.scalar(
            select(Category).where(Category.category_name == cat["name"])
        )
        if existing is not None:
            print(f"  exists:   category {cat['name']}")
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
        print(f"  inserted: category {cat['name']}")
    session.commit()


def _seed_users(session: Session) -> None:
    for spec in DEMO_USERS:
        user = session.scalar(select(User).where(User.email == spec["email"]))
        if user is None:
            session.add(
                User(
                    email=spec["email"],
                    first_name=spec["first_name"],
                    last_name=spec["last_name"],
                    student_number=spec["student_number"],
                    phone_number=spec["phone_number"],
                    password_hash=hash_password(spec["password"]),
                    role=spec["role"],
                    status=UserStatus.ACTIVE,
                )
            )
            print(f"  inserted: user {spec['email']} ({spec['role'].value})")
        else:
            # Refresh so the documented demo credentials always work.
            user.password_hash = hash_password(spec["password"])
            user.role = spec["role"]
            user.status = UserStatus.ACTIVE
            print(
                f"  refresh:  user {spec['email']} "
                "(password/role/status reset to demo values)"
            )
    session.commit()


def _category_id(session: Session, category_name: str) -> int:
    category = session.scalar(
        select(Category).where(Category.category_name == category_name)
    )
    if category is None:
        raise RuntimeError(
            f"category {category_name!r} missing after the category seed — "
            "aborting item seeding (no silent partial seed)"
        )
    return category.id


def _user_id(session: Session, email: str) -> int:
    user = session.scalar(select(User).where(User.email == email))
    if user is None:
        raise RuntimeError(
            f"demo user {email!r} missing after the user seed — "
            "aborting item seeding (no silent partial seed)"
        )
    return user.id


def _seed_items(session: Session) -> list[tuple[LostItem, FoundItem]] | None:
    """Insert demo items only when both item tables are empty.

    Returns the resolved (LostItem, FoundItem) rows for the expected matching
    pairs, or None when item seeding was skipped (tables not empty).
    """
    lost_count = session.scalar(select(func.count()).select_from(LostItem)) or 0
    found_count = session.scalar(select(func.count()).select_from(FoundItem)) or 0
    if lost_count > 0 or found_count > 0:
        print(
            "  skipped:  demo items (lost/found tables are not empty — "
            "existing data preserved, nothing duplicated)"
        )
        return None

    for spec in DEMO_LOST_ITEMS:
        session.add(
            LostItem(
                user_id=_user_id(session, spec["owner_email"]),
                category_id=_category_id(session, spec["category_name"]),
                title=spec["title"],
                description=spec["description"],
                brand=spec["brand"],
                colour=spec["colour"],
                date_lost=spec["date_lost"],
                location_lost=spec["location_lost"],
                status=LostItemStatus.REPORTED,
            )
        )
    for spec in DEMO_FOUND_ITEMS:
        session.add(
            FoundItem(
                user_id=_user_id(session, spec["finder_email"]),
                category_id=_category_id(session, spec["category_name"]),
                title=spec["title"],
                description=spec["description"],
                brand=spec["brand"],
                colour=spec["colour"],
                date_found=spec["date_found"],
                storage_location=spec["storage_location"],
                status=FoundItemStatus.AVAILABLE,
            )
        )
    session.commit()
    print(
        f"  inserted: {len(DEMO_LOST_ITEMS)} lost items, "
        f"{len(DEMO_FOUND_ITEMS)} found items"
    )

    pairs: list[tuple[LostItem, FoundItem]] = []
    for lost_title, found_title in EXPECTED_MATCHING_PAIRS:
        lost = session.scalar(select(LostItem).where(LostItem.title == lost_title))
        found = session.scalar(select(FoundItem).where(FoundItem.title == found_title))
        if lost is None or found is None:
            raise RuntimeError(
                f"could not resolve expected pair {lost_title!r} <-> "
                f"{found_title!r} after insertion"
            )
        pairs.append((lost, found))
    return pairs


def _run_matching_and_verify(session: Session, pairs: list[tuple[LostItem, FoundItem]]) -> None:
    """Run the real matching pass, then assert every expected pair matched.

    ``run_matching_for_found_item`` is the exact runner the Items module
    registers as a ``BackgroundTask`` on item creation (it scores the found
    item against every ``Reported`` LostItem, writes ``Match`` rows above
    ``MATCH_THRESHOLD``, and fires the Module 6 match notifications). It opens
    its own DB session, so this is exercised exactly as the API would.
    """
    for _, found in pairs:
        run_matching_for_found_item(found.id)

    for lost, found in pairs:
        match = session.scalar(
            select(Match).where(
                Match.lost_item_id == lost.id,
                Match.found_item_id == found.id,
            )
        )
        if match is None:
            raise RuntimeError(
                "SEED FAILURE: no Match row for expected pair "
                f"{lost.title!r} <-> {found.title!r} — the matching module "
                "did not suggest it. Check the matching service and threshold."
            )
        if match.status != MatchStatus.SUGGESTED:
            raise RuntimeError(
                f"SEED FAILURE: expected pair {lost.title!r} <-> {found.title!r} "
                f"has status {match.status.value!r}, expected 'Suggested'"
            )
        if match.match_score < MATCH_THRESHOLD:
            raise RuntimeError(
                f"SEED FAILURE: expected pair {lost.title!r} <-> {found.title!r} "
                f"scored {match.match_score}, below threshold {MATCH_THRESHOLD}"
            )
        print(
            f"  match:    {lost.title!r} <-> {found.title!r}: "
            f"score {match.match_score} ({match.status.value})"
        )


def main() -> None:
    url = os.environ.get("DATABASE_URL", DEFAULT_URL)
    engine = create_engine(url)
    with Session(engine) as session:
        print("Seeding categories…")
        _seed_categories(session)
        print("Seeding demo users…")
        _seed_users(session)
        print("Seeding demo items…")
        pairs = _seed_items(session)
        if pairs is not None:
            print("Running matching pass and verifying expected pairs…")
            _run_matching_and_verify(session, pairs)
    print("Seed complete.")


if __name__ == "__main__":
    main()
