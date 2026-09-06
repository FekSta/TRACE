"""Claims module internals (Module 5).

The Claims module owns the Claim → VerificationRecord → CollectionRecord
workflow and the LostItem/FoundItem status transitions it drives.

Import discipline: the Matching module imports **from** Claims (accept →
``create_from_match``), so Claims must never import from Matching — the
dependency is one-way, which is what keeps the two modules independently
extractable (see `ABOUT.md`'s "internal service boundaries").

Transaction discipline: these service functions **mutate the session but do
not commit** — the calling endpoint commits once, so every mutating step
(claim creation, verify/approve, verify/reject, collect) is atomic: all its
writes commit together or none do. Each mutating step also writes exactly one
``AuditLog`` row (via ``audit``) — a Module 5 hard requirement.
"""

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AuditLog,
    Claim,
    CollectionRecord,
    Match,
    User,
    VerificationRecord,
)
from app.models.enums import (
    ClaimStatus,
    ClaimVerificationStatus,
    FoundItemStatus,
    LostItemStatus,
    MatchStatus,
    VerificationResult,
)
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
    (claim creation, verify/approve, verify/reject, collect) calls this once.
    ``actor=None`` marks system-initiated actions (the column is nullable,
    `Review.md` §3)."""
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
    # Contract guard: a Claim is only ever created from an Accepted match. The
    # only caller is the accept endpoint, but the check makes the service
    # function safe for future callers (e.g. a Module 7 manual-claim flow).
    if match.status != MatchStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Claim can only be created from an accepted match",
        )
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


# --- Verify (Module 5 issue 2) -------------------------------------------------

def _ensure_verifiable(claim: Claim) -> None:
    """A claim can be verified only while Active and still Pending — never a
    rejected/completed claim, and never twice (terminal-state guard)."""
    if claim.status != ClaimStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim is not active (already completed or cancelled)",
        )
    if claim.verification_status != ClaimVerificationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Claim has already been verified ({claim.verification_status.value})",
        )


def verify_claim(
    db: Session,
    *,
    claim: Claim,
    officer: User,
    result: ClaimVerificationStatus,
    notes: str | None,
    method: str | None,
) -> Claim:
    """Approve or reject a pending claim (Officer/Admin only).

    **Approve** — ``Claim.VerificationStatus → Approved``, ``LostItem →
    Claimed``, ``FoundItem → Claimed`` (the claimant is entitled to the item;
    it is now reserved, awaiting collection).

    **Reject** — ``Claim.VerificationStatus → Rejected`` and ``Claim.Status →
    Cancelled``. The items never left their open states at accept, so they
    stay ``Reported`` / ``Available`` — free to be matched and claimed again.
    ``Claim.VerificationNotes`` records the officer's reasoning.

    Both outcomes write a ``VerificationRecord`` (``Passed``/``Failed``) and
    one ``AuditLog`` row into the caller's session; the endpoint commits once,
    so the claim status + item statuses + records are atomic.
    """
    _ensure_verifiable(claim)

    claim.officer_id = officer.id
    if notes is not None:
        claim.verification_notes = notes

    if result == ClaimVerificationStatus.APPROVED:
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        action, record_result = "ClaimApproved", VerificationResult.PASSED
    elif result == ClaimVerificationStatus.REJECTED:
        claim.verification_status = ClaimVerificationStatus.REJECTED
        claim.status = ClaimStatus.CANCELLED
        action, record_result = "ClaimRejected", VerificationResult.FAILED
    else:  # PENDING — direct-call guard (the API validator also blocks this)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="result must be 'Approved' or 'Rejected'",
        )

    db.add(
        VerificationRecord(
            claim_id=claim.id,
            officer_id=officer.id,
            verification_method=method,
            result=record_result,
            notes=notes,
        )
    )
    audit(
        db,
        actor=officer,
        action=action,
        entity_name="Claim",
        entity_id=claim.id,
    )
    return claim


# --- Collect (Module 5 issue 2) -------------------------------------------------

def collect_claim(
    db: Session,
    *,
    claim: Claim,
    officer: User,
    collected_by: str | None,
    recipient_signature: str | None,
    remarks: str | None,
) -> Claim:
    """Complete the workflow: hand the item over and finish the claim.

    Requires an **Approved** claim (never Pending/Rejected) that is still
    **Active** (never Cancelled or already-Completed — guards re-entry on
    terminal states).

    ``Claim.Status → Completed``, ``Claim.CollectionDate → now``,
    ``LostItem → Closed``, ``FoundItem → Returned``. A ``CollectionRecord``
    and a ``ClaimCollected`` AuditLog row join the same atomic transaction.
    """
    if claim.status != ClaimStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim is not active (already completed or cancelled)",
        )
    if claim.verification_status != ClaimVerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim must be approved before collection",
        )

    claim.status = ClaimStatus.COMPLETED
    claim.collection_date = datetime.now(UTC)
    claim.lost_item.status = LostItemStatus.CLOSED
    claim.found_item.status = FoundItemStatus.RETURNED

    db.add(
        CollectionRecord(
            claim_id=claim.id,
            officer_id=officer.id,
            collected_by=collected_by,
            recipient_signature=recipient_signature,
            remarks=remarks,
        )
    )
    audit(
        db,
        actor=officer,
        action="ClaimCollected",
        entity_name="Claim",
        entity_id=claim.id,
    )
    return claim
