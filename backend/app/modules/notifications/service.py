"""Notification triggers (Module 6, issue 2).

Each trigger function does two things in a fixed order:

1. **Write `Notification` row(s) and commit them first.** The row is the
   source of truth — it must exist on every trigger no matter what happens
   to the email.
2. **Attempt the email send through ``email_backend``** (best-effort). An
   SMTP failure is caught and logged here and **never** rolls back the row —
   the two are fully decoupled.

All four triggers run inside `FastAPI BackgroundTask`s (or inside the Module
4 matching background runners), never in the request/response path, so item
creation / claim actions never slow down on email delivery (`ABOUT.md`'s
single notification channel: email, delivered by direct in-process calls —
no message queue).
"""

import logging

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Claim, Match, Notification, User
from app.models.enums import ClaimVerificationStatus, NotificationType
from app.modules.notifications.email_backend import email_backend

logger = logging.getLogger(__name__)


def _send_email(to: str, subject: str, body: str) -> None:
    """Best-effort delivery — failures are logged, never raised (the
    `Notification` row is already committed by the caller)."""
    try:
        email_backend.send(to, subject, body)
    except Exception:
        logger.exception(
            "email send to %s failed (notification row already persisted)", to
        )


def _row(
    db: Session,
    *,
    user: User,
    notification_type: NotificationType,
    title: str,
    message: str,
) -> Notification:
    row = Notification(
        user_id=user.id,
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(row)
    return row


# --- Trigger 1: new Match suggested (from Module 4) ----------------------------

def notify_match_suggested(match_id: int) -> None:
    """A new `Suggested` Match — email **both** parties.

    Fired from the Module 4 matching background runners after the Match row
    commits. Recipients: the LostItem reporter (\"we may have found your
    item\") and the finder (\"the item you found may belong to someone\").
    """
    db = SessionLocal()
    try:
        match = db.get(Match, match_id)
        if match is None:
            return
        lost_user = match.lost_item.user
        found_user = match.found_item.user
        messages = (
            (
                lost_user,
                f"Your report '{match.lost_item.title}' has a potential match "
                f"(score {match.match_score}). Log in to review it and accept "
                "it if it is yours.",
            ),
            (
                found_user,
                f"The item you found ('{match.found_item.title}') may belong to "
                f"someone (score {match.match_score}). Log in to review it.",
            ),
        )
        for user, message in messages:
            _row(
                db,
                user=user,
                notification_type=NotificationType.MATCH,
                title="Potential match found",
                message=message,
            )
        db.commit()
        for user, message in messages:
            _send_email(user.email, "TRACE: a potential match was found", message)
    except Exception:  # pragma: no cover - background task must not crash the app
        logger.exception("notify_match_suggested failed for match %s", match_id)
    finally:
        db.close()


# --- Trigger 2: Claim submitted (from Module 5's create_from_match) ------------

def notify_claim_submitted(claim_id: int) -> None:
    """A Claim was created from an accepted Match — email the claimant.

    Fired as a `BackgroundTask` from the Matching accept endpoint.
    """
    db = SessionLocal()
    try:
        claim = db.get(Claim, claim_id)
        if claim is None or claim.user is None:
            return
        message = (
            f"Your claim for '{claim.found_item.title}' was submitted and is "
            "pending verification by an officer."
        )
        _row(
            db,
            user=claim.user,
            notification_type=NotificationType.CLAIM,
            title="Claim submitted",
            message=message,
        )
        db.commit()
        _send_email(claim.user.email, "TRACE: your claim was submitted", message)
    except Exception:  # pragma: no cover - background task must not crash the app
        logger.exception("notify_claim_submitted failed for claim %s", claim_id)
    finally:
        db.close()


# --- Trigger 3+4: Claim approved/rejected + item ready for collection ----------

def notify_claim_verified(claim_id: int) -> None:
    """A Claim was verified — email the claimant.

    Fired as a `BackgroundTask` from the Claims verify endpoint. On
    **approve** it fires **two** notifications: \"claim approved\" and \"item
    ready for collection\" (interpretation: once a claim is approved, the
    FoundItem is ready to be handed over — see `Review.md` §Module 6). On
    **reject** it fires one: \"claim rejected\", with the officer's notes.
    """
    db = SessionLocal()
    try:
        claim = db.get(Claim, claim_id)
        if claim is None or claim.user is None:
            return
        if claim.verification_status == ClaimVerificationStatus.APPROVED:
            approved = f"Your claim for '{claim.found_item.title}' was approved."
            ready = (
                f"Your item '{claim.found_item.title}' is ready for collection — "
                "please collect it from the lost & found office."
            )
            _row(
                db,
                user=claim.user,
                notification_type=NotificationType.CLAIM,
                title="Claim approved",
                message=approved,
            )
            _row(
                db,
                user=claim.user,
                notification_type=NotificationType.CLAIM,
                title="Item ready for collection",
                message=ready,
            )
            db.commit()
            _send_email(
                claim.user.email, "TRACE: your claim was approved", approved
            )
            _send_email(
                claim.user.email,
                "TRACE: your item is ready for collection",
                ready,
            )
        elif claim.verification_status == ClaimVerificationStatus.REJECTED:
            reason = claim.verification_notes or "no reason recorded"
            rejected = (
                f"Your claim for '{claim.found_item.title}' was rejected. "
                f"Officer notes: {reason}"
            )
            _row(
                db,
                user=claim.user,
                notification_type=NotificationType.CLAIM,
                title="Claim rejected",
                message=rejected,
            )
            db.commit()
            _send_email(
                claim.user.email, "TRACE: your claim was rejected", rejected
            )
    except Exception:  # pragma: no cover - background task must not crash the app
        logger.exception("notify_claim_verified failed for claim %s", claim_id)
    finally:
        db.close()
