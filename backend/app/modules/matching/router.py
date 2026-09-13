"""Matching API (Module 4, issue 2; Module 5 handoff).

- ``GET /matches`` — list matches. Plain `User`s only ever see matches
  touching *their own* items (reusing the Module 3 scoping pattern);
  Officer/Admin see all. Optional filters: ``item_id`` (a match where the
  lost or the found item is that id), ``user_id`` (staff), ``status``.
- ``POST /matches/{id}/accept`` / ``POST /matches/{id}/reject`` — resolve a
  `Suggested` match. Accepting a match now hands off to the Claims module
  (Module 5) via a **direct in-process function call**
  (``claims.service.create_from_match``) — never HTTP between modules
  (`ABOUT.md`). The `Match.Status` update and the new `Claim` row share one
  transaction, so they commit (or roll back) together.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FoundItem, LostItem, Match, User
from app.models.enums import MatchStatus
from app.modules.auth.deps import get_current_user
from app.modules.claims.service import create_from_match
from app.modules.items.service import is_staff
from app.modules.matching.schemas import MatchResponse
from app.modules.matching.service import get_scoped_match
from app.modules.notifications.service import notify_claim_submitted

router = APIRouter(tags=["matching"])


def _user_names(db: Session, user_ids: set[int]) -> dict[int, str]:
    """Matching module's own batched id->name lookup.

    Deliberately local: modules own their joins, so there is no shared
    cross-module user-directory helper (Notes.md §10.8).
    """
    if not user_ids:
        return {}
    rows = db.execute(
        select(User.id, User.first_name, User.last_name).where(User.id.in_(user_ids))
    ).all()
    return {user_id: f"{first} {last}".strip() for user_id, first, last in rows}


def _enrich_matches(
    db: Session, matches: list[Match], current_user: User
) -> list[MatchResponse]:
    """Add item titles (any caller) and reporter names (staff only).

    Replaces `Lost #{id}` / `Found #{id}` and `User #{id}` on the match
    screens. One batched query per lookup, never one per row.
    """
    if not matches:
        return matches
    lost_rows = db.execute(
        select(LostItem.id, LostItem.title, LostItem.user_id).where(
            LostItem.id.in_({m.lost_item_id for m in matches})
        )
    ).all()
    found_rows = db.execute(
        select(FoundItem.id, FoundItem.title, FoundItem.user_id).where(
            FoundItem.id.in_({m.found_item_id for m in matches})
        )
    ).all()
    lost_map = {item_id: (title, user_id) for item_id, title, user_id in lost_rows}
    found_map = {item_id: (title, user_id) for item_id, title, user_id in found_rows}
    staff = is_staff(current_user)
    if staff:
        user_ids = {user_id for _, _, user_id in lost_rows} | {
            user_id for _, _, user_id in found_rows
        }
    else:
        user_ids = {current_user.id}
    names = _user_names(db, user_ids)
    enriched: list[MatchResponse] = []
    for match in matches:
        lost_title, lost_user_id = lost_map.get(match.lost_item_id, (None, None))
        found_title, found_user_id = found_map.get(match.found_item_id, (None, None))
        enriched.append(
            MatchResponse.model_validate(match).model_copy(
                update={
                    "lost_item_title": lost_title,
                    "found_item_title": found_title,
                    "lost_reporter_name": names.get(lost_user_id)
                    if (staff and lost_user_id is not None)
                    else None,
                    "found_reporter_name": names.get(found_user_id)
                    if (staff and found_user_id is not None)
                    else None,
                }
            )
        )
    return enriched


@router.get("/matches", response_model=list[MatchResponse])
def list_matches(
    item_id: int | None = None,
    user_id: int | None = None,
    status: MatchStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Match]:
    """List matches — Users see only matches on their own items; staff see all."""
    q = select(Match).order_by(Match.generated_at.desc())

    if not is_staff(current_user):
        # Module 3 scoping: non-staff rows are always filtered to own items,
        # so a User filtering by someone else's ids simply gets an empty list.
        q = q.where(
            or_(
                Match.lost_item.has(LostItem.user_id == current_user.id),
                Match.found_item.has(FoundItem.user_id == current_user.id),
            )
        )
        if user_id is not None and user_id != current_user.id:
            return []  # silent empty list — never reveal another user's matches
    elif user_id is not None:
        q = q.where(
            or_(
                Match.lost_item.has(LostItem.user_id == user_id),
                Match.found_item.has(FoundItem.user_id == user_id),
            )
        )

    if item_id is not None:
        q = q.where(
            or_(Match.lost_item_id == item_id, Match.found_item_id == item_id)
        )
    if status is not None:
        q = q.where(Match.status == status)

    matches = list(db.scalars(q).all())
    return _enrich_matches(db, matches, current_user)


def _resolve_match(
    match_id: int,
    new_status: MatchStatus,
    current_user: User,
    db: Session,
) -> Match:
    """Guard + status flip for a `Suggested` match. Does NOT commit — the
    caller decides what else joins the transaction (e.g. Claim creation on
    accept) so everything commits or rolls back together."""
    match = get_scoped_match(db, match_id, current_user)
    if match.status != MatchStatus.SUGGESTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Match already {match.status.value.lower()}",
        )
    match.status = new_status
    return match


@router.post("/matches/{match_id}/accept", response_model=MatchResponse)
def accept_match(
    match_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Match:
    """Accept a suggested match and hand off to the Claims module.

    The Claim is created via a direct in-process call to
    ``claims.service.create_from_match`` (Module 5 issue 1). Match status + Claim
    + Claim-creation AuditLog commit in one transaction. The "claim submitted"
    notification (Module 6) fires as a `BackgroundTask` after the response, so
    accepting never waits on email delivery.
    """
    match = _resolve_match(match_id, MatchStatus.ACCEPTED, current_user, db)
    claim = create_from_match(db, match, actor=current_user)
    db.commit()
    db.refresh(match)
    background_tasks.add_task(notify_claim_submitted, claim.id)
    return _enrich_matches(db, [match], current_user)[0]


@router.post("/matches/{match_id}/reject", response_model=MatchResponse)
def reject_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Match:
    """Reject a suggested match (no downstream effects)."""
    match = _resolve_match(match_id, MatchStatus.REJECTED, current_user, db)
    db.commit()
    db.refresh(match)
    return _enrich_matches(db, [match], current_user)[0]
