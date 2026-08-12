"""Matching API (Module 4, issue 2).

- ``GET /matches`` — list matches. Plain `User`s only ever see matches
  touching *their own* items (reusing the Module 3 scoping pattern);
  Officer/Admin see all. Optional filters: ``item_id`` (a match where the
  lost or the found item is that id), ``user_id`` (staff), ``status``.
- ``POST /matches/{id}/accept`` / ``POST /matches/{id}/reject`` — resolve a
  `Suggested` match. The downstream effects of an accepted match (Claim
  creation, item status cascade) are Module 5's job — here the effect is
  simply updating ``Match.Status``.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FoundItem, LostItem, Match, User
from app.models.enums import MatchStatus
from app.modules.auth.deps import get_current_user
from app.modules.items.service import is_staff
from app.modules.matching.schemas import MatchResponse
from app.modules.matching.service import get_scoped_match

router = APIRouter(tags=["matching"])


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

    return list(db.scalars(q).all())


def _resolve_match(
    match_id: int,
    new_status: MatchStatus,
    current_user: User,
    db: Session,
) -> Match:
    match = get_scoped_match(db, match_id, current_user)
    if match.status != MatchStatus.SUGGESTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Match already {match.status.value.lower()}",
        )
    match.status = new_status
    db.commit()
    db.refresh(match)
    return match


@router.post("/matches/{match_id}/accept", response_model=MatchResponse)
def accept_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Match:
    """Accept a suggested match (updates `Match.Status`; downstream effects are Module 5)."""
    return _resolve_match(match_id, MatchStatus.ACCEPTED, current_user, db)


@router.post("/matches/{match_id}/reject", response_model=MatchResponse)
def reject_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Match:
    """Reject a suggested match."""
    return _resolve_match(match_id, MatchStatus.REJECTED, current_user, db)
