"""Claims module internals (Module 5).

The Claims module owns the Claim → VerificationRecord → CollectionRecord
workflow and the LostItem/FoundItem status transitions it drives.

Import discipline: the Matching module imports **from** Claims (accept →
``create_from_match``), so Claims must never import from Matching — the
dependency is one-way, which is what keeps the two modules independently
extractable (see `ABOUT.md`'s "internal service boundaries").
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Claim, Match, User
from app.models.enums import ClaimStatus, ClaimVerificationStatus
from app.modules.items.service import is_staff  # reuse Module 3 role logic


# --- Audit -------------------------------------------------------------------

def audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_name: str,
    entity_id: int | None,
) -> AuditLog:
    """Append exactly one `AuditLog` row. Every mutating step in this module
    (claim creation, verify/approve, verify/reject, collect) calls this once —
    a Module 5 hard requirement. ``actor=None`` marks system-initiated actions
    (the column is nullable, `Review.md` §3)."""
    row = AuditLog(
        user_id=actor.id if actor is not None else None,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
    )
    db.add(row)
    return row


# --- Scoping ------------------------------------------------------------------

def get_scoped_claim(db: Session, claim_id: int, user: User) -> Claim:
    """Fetch a Claim with the Module 3 scoping pattern; 404 for missing or
    out-of-scope (never 403, so row existence is not leaked)."""
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found"
        )
    if not is_staff(user) and claim.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found"
        )
    return claim


# --- Claim creation (Module 5 issue 1) ----------------------------------------

def create_from_match(db: Session, match: Match, actor: User) -> Claim:
    """Create a Claim for an accepted Match.

    Called **directly** from the Matching module's accept-match endpoint — a
    plain Python function call in the same process/transaction, never an HTTP
    request between modules. The match status update and the Claim write share
    one session, so they commit (or roll back) together.

    The claimant is the reporter of the LostItem (``lost_item.user_id``): they
    claim the FoundItem is their lost item. ``VerificationStatus`` starts at
    ``Pending`` and ``Claim.Status`` at ``Active`` (the model defaults implied
    by `Entities.md`). Item statuses do **not** move here — approve/reject/
    collect drive those (Module 5 issue 2).

    Idempotent: if a Claim already exists for the same (lost, found) pair it is
    returned untouched — a Match can only be accepted once, and this makes any
    retry safe.
    """
    existing = db.scalar(
        select(Claim).where(
            Claim.lost_item_id == match.lost_item_id,
            Claim.found_item_id == match.found_item_id,
        )
    )
    if existing is not None:
        return existing

    claim = Claim(
        lost_item_id=match.lost_item_id,
        found_item_id=match.found_item_id,
        user_id=match.lost_item.user_id,
        verification_status=ClaimVerificationStatus.PENDING,
        status=ClaimStatus.ACTIVE,
    )
    db.add(claim)
    db.flush()  # materialize claim.id for the audit row below
    audit(
        db,
        actor=actor,
        action="ClaimCreated",
        entity_name="Claim",
        entity_id=claim.id,
    )
    return claim
