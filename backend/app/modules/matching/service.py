"""Matching Engine internals (Module 4, issue 2).

Two moving parts:

1. **Background runners** — ``run_matching_for_lost_item`` /
   ``run_matching_for_found_item`` are invoked from the Items module via
   ``FastAPI BackgroundTask`` *after* the creation response has been sent,
   so item creation never blocks on the scoring pass. Each runner opens its
   own DB session (the request session is closed by the time the task runs).

2. **Scoped-match helper** — ``get_scoped_match`` applies the Module 3
   scoping pattern to ``Match`` rows: plain `User`s may only touch matches
   where *either* the lost or the found item is theirs; Officer/Admin see
   everything. Cross-user access returns 404, never 403.

All matching is a direct in-process call against the shared database — no
message queue, no HTTP between modules (`ABOUT.md`).
"""

import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import FoundItem, LostItem, Match, User
from app.models.enums import FoundItemStatus, LostItemStatus, MatchStatus
from app.modules.items.service import is_staff  # reuse Module 3 role logic
from app.modules.matching.utils.similarity import MATCH_THRESHOLD, score_pair

logger = logging.getLogger(__name__)


def _to_lost_dict(item: LostItem) -> dict:
    return {
        "category_id": item.category_id,
        "description": item.description,
        "date_lost": item.date_lost,
        "location_lost": item.location_lost,
    }


def _to_found_dict(item: FoundItem) -> dict:
    return {
        "category_id": item.category_id,
        "description": item.description,
        "date_found": item.date_found,
        "storage_location": item.storage_location,
    }


def _existing_match(db: Session, lost_id: int, found_id: int) -> Match | None:
    """De-dup guard: never create two Match rows for the same pair."""
    return db.scalar(
        select(Match).where(
            Match.lost_item_id == lost_id, Match.found_item_id == found_id
        )
    )


def _run_matching(db: Session, lost_items: list[LostItem], found_items: list[FoundItem]) -> int:
    """Score every lost/found pair and persist `Suggested` matches above threshold.

    Returns the number of Match rows created.
    """
    created = 0
    for lost in lost_items:
        for found in found_items:
            if _existing_match(db, lost.id, found.id) is not None:
                continue
            result = score_pair(_to_lost_dict(lost), _to_found_dict(found))
            if result.score >= MATCH_THRESHOLD:
                db.add(
                    Match(
                        lost_item_id=lost.id,
                        found_item_id=found.id,
                        match_score=result.score,
                        match_reason=result.reason,
                        status=MatchStatus.SUGGESTED,
                    )
                )
                created += 1
    db.commit()
    return created


def run_matching_for_lost_item(lost_item_id: int) -> None:
    """Score a newly-created LostItem against all `Available` FoundItems.

    Runs inside a BackgroundTask after the creation response is sent.
    """
    db = SessionLocal()
    try:
        lost_item = db.get(LostItem, lost_item_id)
        if lost_item is None or lost_item.status != LostItemStatus.REPORTED:
            return
        found_items = list(
            db.scalars(
                select(FoundItem).where(FoundItem.status == FoundItemStatus.AVAILABLE)
            ).all()
        )
        created = _run_matching(db, [lost_item], found_items)
        logger.info("matching: lost item %s -> %s new matches", lost_item_id, created)
    except Exception:  # pragma: no cover - background task must not crash the app
        logger.exception("matching: failed for lost item %s", lost_item_id)
    finally:
        db.close()


def run_matching_for_found_item(found_item_id: int) -> None:
    """Score a newly-created FoundItem against all `Reported` LostItems.

    Runs inside a BackgroundTask after the creation response is sent.
    """
    db = SessionLocal()
    try:
        found_item = db.get(FoundItem, found_item_id)
        if found_item is None or found_item.status != FoundItemStatus.AVAILABLE:
            return
        lost_items = list(
            db.scalars(
                select(LostItem).where(LostItem.status == LostItemStatus.REPORTED)
            ).all()
        )
        created = _run_matching(db, lost_items, [found_item])
        logger.info("matching: found item %s -> %s new matches", found_item_id, created)
    except Exception:  # pragma: no cover - background task must not crash the app
        logger.exception("matching: failed for found item %s", found_item_id)
    finally:
        db.close()


def get_scoped_match(db: Session, match_id: int, user: User) -> Match:
    """Fetch a Match with Module 3 scoping; 404 for missing or out-of-scope."""
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    if not is_staff(user) and not (
        match.lost_item.user_id == user.id or match.found_item.user_id == user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return match
