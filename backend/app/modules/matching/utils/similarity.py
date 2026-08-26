"""Similarity scoring for the TRACE matching engine (Module 4, issue 1).

Pure, deterministic, offline scoring of one LostItem/FoundItem pair, per
`ABOUT.md`'s **one matching engine** constraint: Category + Location + Date +
Description similarity. No LLM, no network, no external service — this module
imports nothing outside the standard library so it can be run in any Python
shell inside the backend runtime.

Weights (max total = 100; full formula and rationale in `Review.md` §Module 4):

- **Category  40 pts** — hard gate: different categories → score 0.00.
- **Location  15 pts** — token-set Jaccard similarity between
  ``location_lost`` and ``storage_location`` (the FoundItem's storage
  location is the only location we store; interpretation recorded in
  `Review.md`).
- **Date      15 pts** — linear decay: 15 when the dates are identical,
  falling to 0 at ≥ 14 days apart.
- **Description 30 pts** — token-set Jaccard similarity over stopword-free
  description text.

Inputs are plain dicts (the DoD's hand-written samples) or any mapping with
the documented keys. Missing data for a component contributes 0 (neutral) —
it never penalises the other components.

    score_pair(lost_dict, found_dict) -> MatchResult(score, reason)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Mapping

# --- Weights (sum to 100) ---------------------------------------------------
_CATEGORY_W = Decimal("40")
_LOCATION_W = Decimal("15")
_DATE_W = Decimal("15")
_DESCRIPTION_W = Decimal("30")

# Date proximity window: score decays linearly to 0 at this many days apart.
_DATE_WINDOW_DAYS = 14

# Score at or above which a `Suggested` Match row is created (see Review.md).
MATCH_THRESHOLD = Decimal("60.00")

# A tiny stopword list for short text/location fields (campus-pilot scale).
_STOPWORDS = {
    "a", "an", "the", "of", "at", "in", "on", "near", "and", "for", "with",
    "to", "from", "campus", "university", "building", "room",
}


@dataclass(frozen=True)
class MatchResult:
    """Result of scoring one LostItem/FoundItem pair."""

    score: Decimal
    reason: str


def _tokens(text: str) -> set[str]:
    """Normalise text to a set of stopword-free tokens (lowercase, no punct)."""
    cleaned = "".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in text)
    return {t for t in cleaned.split() if t and t not in _STOPWORDS}


def _jaccard(a: set[str], b: set[str]) -> float:
    """Jaccard similarity; 0.0 when either side is empty."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _as_date(value) -> date | None:
    """Normalise a date or ISO string to a ``date``; None when unparseable."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _fmt(value) -> str:
    return str(value) if value is not None else "n/a"


def score_pair(lost: Mapping, found: Mapping) -> MatchResult:
    """Score one LostItem/FoundItem pair -> ``MatchResult(score, reason)``.

    Expected keys (missing keys are treated as neutral):

    - lost:  ``category_id``, ``description``, ``date_lost``, ``location_lost``
    - found: ``category_id``, ``description``, ``date_found``, ``storage_location``

    Category note: the hard gate only fires when *both* sides have a
    ``category_id``; if one side is missing, the pair gets the full 40 points
    (benefit of the doubt). Through the API this cannot happen — both item
    tables have NOT-NULL category FKs — but hand-written dicts may hit it.
    """

    # --- Category (hard gate) ---------------------------------------------
    lost_cat = lost.get("category_id")
    found_cat = found.get("category_id")
    if lost_cat is not None and found_cat is not None and lost_cat != found_cat:
        return MatchResult(
            score=Decimal("0.00"),
            reason=f"Different category (category {lost_cat} vs {found_cat})",
        )

    reasons: list[str] = []
    total = Decimal("0.00")

    # Category credit (gate passed or one side missing).
    total += _CATEGORY_W
    reasons.append(f"same category (category {lost_cat or found_cat})")

    # --- Location ----------------------------------------------------------
    loc_lost = lost.get("location_lost")
    loc_found = found.get("storage_location")
    if loc_lost and loc_found:
        sim = _jaccard(_tokens(str(loc_lost)), _tokens(str(loc_found)))
        total += (_LOCATION_W * Decimal(str(round(sim, 4)))).quantize(Decimal("0.01"))
        if sim >= 0.9:
            reasons.append("same location")
        elif sim >= 0.4:
            reasons.append(f"nearby location ({_fmt(loc_lost)} ~ {_fmt(loc_found)})")

    # --- Date proximity ------------------------------------------------------
    d_lost = _as_date(lost.get("date_lost"))
    d_found = _as_date(found.get("date_found"))
    if d_lost is not None and d_found is not None:
        days = abs((d_found - d_lost).days)
        decay = max(0.0, 1.0 - days / _DATE_WINDOW_DAYS)
        total += (_DATE_W * Decimal(str(round(decay, 4)))).quantize(Decimal("0.01"))
        if decay > 0:
            if days == 0:
                reasons.append("same date")
            else:
                reasons.append(f"{days} day(s) apart")

    # --- Description ----------------------------------------------------------
    desc_lost = lost.get("description")
    desc_found = found.get("description")
    if desc_lost and desc_found:
        sim = _jaccard(_tokens(str(desc_lost)), _tokens(str(desc_found)))
        total += (_DESCRIPTION_W * Decimal(str(round(sim, 4)))).quantize(Decimal("0.01"))
        if sim >= 0.01:
            reasons.append(f"{round(sim * 100)}% description overlap")

    score = min(total, Decimal("100.00"))
    return MatchResult(score=score, reason="; ".join(reasons))
