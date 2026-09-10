"""Dashboard module tests — Administrator "Generate Reports" flow.

Covers all four report types (users, lost_items, found_items, claims) with at
least one filter and one sort each, the Administrator-only gate, the
server-side joins, and the 400-on-invalid-input contract.

Authority: `assets/diagrams/data-flow.md` §Administrator/3 "Generate Reports",
Notes.md §15, Review.md "Admin Reports page".

Exit note: the suite runs against SQLite in-memory (see conftest.py), so the
only assertion this cannot make is native-Postgres enum storage — the enum
*values* are asserted through the API instead.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.models import FoundItem, LostItem
from app.models.enums import FoundItemStatus, LostItemStatus

REPORTS = "/dashboard/reports"


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# Authorization — Administrator-only
# =============================================================================


class TestReportsAuthorization:
    def test_no_token_returns_401(self, client):
        assert client.get(f"{REPORTS}?type=users").status_code == 401

    def test_user_token_returns_403(self, client, user_token):
        resp = client.get(f"{REPORTS}?type=users", headers=_auth(user_token))
        assert resp.status_code == 403

    def test_officer_token_returns_403(self, client, officer_token):
        resp = client.get(f"{REPORTS}?type=users", headers=_auth(officer_token))
        assert resp.status_code == 403

    def test_admin_token_returns_200(self, client, admin_token):
        resp = client.get(f"{REPORTS}?type=users", headers=_auth(admin_token))
        assert resp.status_code == 200
        assert resp.json()["report_type"] == "users"


# =============================================================================
# Validation — clear 400s, never a silent fallback
# =============================================================================


class TestReportsValidation:
    def test_missing_type_returns_422(self, client, admin_token):
        assert client.get(REPORTS, headers=_auth(admin_token)).status_code == 422

    def test_invalid_type_returns_400_with_message(self, client, admin_token):
        resp = client.get(f"{REPORTS}?type=bogus", headers=_auth(admin_token))
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert "Invalid report type" in detail
        assert "lost_items" in detail

    @pytest.mark.parametrize(
        "report_type,bad_sort",
        [
            ("users", "date_lost"),
            ("lost_items", "registered"),
            ("found_items", "officer"),
            ("claims", "title"),
        ],
    )
    def test_invalid_sort_by_returns_400(self, client, admin_token, report_type, bad_sort):
        resp = client.get(
            f"{REPORTS}?type={report_type}&sort_by={bad_sort}",
            headers=_auth(admin_token),
        )
        assert resp.status_code == 400
        assert "Invalid sort_by" in resp.json()["detail"]

    def test_invalid_sort_order_returns_400(self, client, admin_token):
        resp = client.get(
            f"{REPORTS}?type=users&sort_order=sideways", headers=_auth(admin_token)
        )
        assert resp.status_code == 400
        assert "Invalid sort_order" in resp.json()["detail"]

    def test_invalid_status_for_report_returns_400(self, client, admin_token):
        resp = client.get(
            f"{REPORTS}?type=found_items&status=Reported", headers=_auth(admin_token)
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert "Invalid status" in detail
        assert "Available" in detail

    def test_invalid_role_returns_400(self, client, admin_token):
        resp = client.get(
            f"{REPORTS}?type=users&role=Superuser", headers=_auth(admin_token)
        )
        assert resp.status_code == 400
        assert "Invalid role" in resp.json()["detail"]

    def test_invalid_verification_status_returns_400(self, client, admin_token):
        resp = client.get(
            f"{REPORTS}?type=claims&verification_status=Bogus",
            headers=_auth(admin_token),
        )
        assert resp.status_code == 400
        assert "Invalid verification status" in resp.json()["detail"]


# =============================================================================
# Users report
# =============================================================================


class TestUsersReport:
    def test_returns_expected_columns(self, client, admin_token, user):
        body = client.get(f"{REPORTS}?type=users", headers=_auth(admin_token)).json()
        assert body["report_type"] == "users"
        assert body["count"] == len(body["rows"]) >= 1
        assert body["generated_at"]

        row = next(r for r in body["rows"] if r["email"] == "ada@example.com")
        assert set(row) == {
            "id",
            "first_name",
            "last_name",
            "student_number",
            "email",
            "role",
            "status",
            "created_at",
        }
        assert row["first_name"] == "Ada"
        assert row["last_name"] == "Lovelace"
        assert row["role"] == "User"
        assert row["status"] == "Active"

    def test_role_filter(self, client, admin_token, user, officer):
        body = client.get(
            f"{REPORTS}?type=users&role=Officer", headers=_auth(admin_token)
        ).json()
        emails = {r["email"] for r in body["rows"]}
        assert "officer@example.com" in emails
        assert "ada@example.com" not in emails

    def test_status_filter(self, client, admin_token, user, suspended_user):
        body = client.get(
            f"{REPORTS}?type=users&status=Suspended", headers=_auth(admin_token)
        ).json()
        assert {r["email"] for r in body["rows"]} == {"suspended@example.com"}

    def test_sort_by_last_name_ascending(self, client, admin_token, user, bob, officer):
        body = client.get(
            f"{REPORTS}?type=users&sort_by=last_name&sort_order=asc",
            headers=_auth(admin_token),
        ).json()
        last_names = [r["last_name"] for r in body["rows"]]
        assert last_names == sorted(last_names)
        assert last_names[0] == "Builder"  # Bob

    def test_sort_by_last_name_descending(self, client, admin_token, user, bob):
        body = client.get(
            f"{REPORTS}?type=users&sort_by=last_name&sort_order=desc",
            headers=_auth(admin_token),
        ).json()
        last_names = [r["last_name"] for r in body["rows"]]
        assert last_names == sorted(last_names, reverse=True)


# =============================================================================
# Lost items report
# =============================================================================


class TestLostItemsReport:
    def test_joins_category_and_reporter(
        self, client, admin_token, lost_item, electronics_category
    ):
        body = client.get(
            f"{REPORTS}?type=lost_items", headers=_auth(admin_token)
        ).json()
        assert body["report_type"] == "lost_items"
        row = next(r for r in body["rows"] if r["id"] == lost_item.id)
        assert row["item"] == "Silver laptop"
        assert row["category"] == "Electronics"
        assert row["reported_by"] == "Ada Lovelace"
        assert row["status"] == "Reported"

    def test_category_filter(self, client, admin_token, db_session, user, lost_item, bags_category):
        db_session.add(
            LostItem(
                user_id=user.id,
                category_id=bags_category.id,
                title="Black backpack",
                date_lost=date(2026, 8, 1),
                location_lost="Library",
                status=LostItemStatus.REPORTED,
            )
        )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=lost_items&category_id={bags_category.id}",
            headers=_auth(admin_token),
        ).json()
        assert len(body["rows"]) == 1
        assert body["rows"][0]["category"] == "Bags"

    def test_status_filter(self, client, admin_token, db_session, user, electronics_category):
        db_session.add(
            LostItem(
                user_id=user.id,
                category_id=electronics_category.id,
                title="Closed item",
                status=LostItemStatus.CLOSED,
            )
        )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=lost_items&status=Closed", headers=_auth(admin_token)
        ).json()
        assert [r["item"] for r in body["rows"]] == ["Closed item"]

    def test_reported_by_filter(self, client, admin_token, db_session, user, bob, lost_item, electronics_category):
        db_session.add(
            LostItem(
                user_id=bob.id,
                category_id=electronics_category.id,
                title="Bob's lost item",
                status=LostItemStatus.REPORTED,
            )
        )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=lost_items&user_id={bob.id}", headers=_auth(admin_token)
        ).json()
        assert [r["reported_by"] for r in body["rows"]] == ["Bob Builder"]

    def test_date_range_filter(self, client, admin_token, db_session, user, electronics_category):
        for title, day in [("Early", date(2026, 1, 5)), ("Late", date(2026, 6, 20))]:
            db_session.add(
                LostItem(
                    user_id=user.id,
                    category_id=electronics_category.id,
                    title=title,
                    date_lost=day,
                    status=LostItemStatus.REPORTED,
                )
            )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=lost_items&date_from=2026-06-01&date_to=2026-06-30",
            headers=_auth(admin_token),
        ).json()
        assert [r["item"] for r in body["rows"]] == ["Late"]

    def test_sort_by_item_title_ascending(self, client, admin_token, db_session, user, electronics_category):
        for title in ["Zebra", "Apple", "Mango"]:
            db_session.add(
                LostItem(
                    user_id=user.id,
                    category_id=electronics_category.id,
                    title=title,
                    status=LostItemStatus.REPORTED,
                )
            )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=lost_items&sort_by=title&sort_order=asc",
            headers=_auth(admin_token),
        ).json()
        titles = [r["item"] for r in body["rows"]]
        assert titles == sorted(titles)


# =============================================================================
# Found items report
# =============================================================================


class TestFoundItemsReport:
    def test_joins_category_and_finder(
        self, client, admin_token, found_item, electronics_category
    ):
        body = client.get(
            f"{REPORTS}?type=found_items", headers=_auth(admin_token)
        ).json()
        assert body["report_type"] == "found_items"
        row = next(r for r in body["rows"] if r["id"] == found_item.id)
        assert row["item"] == "Blue Sony headphones"
        assert row["category"] == "Electronics"
        assert row["found_by"] == "Bob Builder"
        assert row["status"] == "Available"

    def test_status_filter(self, client, admin_token, db_session, bob, found_item, electronics_category):
        db_session.add(
            FoundItem(
                user_id=bob.id,
                category_id=electronics_category.id,
                title="Returned umbrella",
                status=FoundItemStatus.RETURNED,
            )
        )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=found_items&status=Returned", headers=_auth(admin_token)
        ).json()
        assert [r["item"] for r in body["rows"]] == ["Returned umbrella"]

    def test_found_by_filter(self, client, admin_token, db_session, user, bob, found_item, electronics_category):
        db_session.add(
            FoundItem(
                user_id=user.id,
                category_id=electronics_category.id,
                title="Ada found something",
                status=FoundItemStatus.AVAILABLE,
            )
        )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=found_items&user_id={user.id}", headers=_auth(admin_token)
        ).json()
        assert [r["found_by"] for r in body["rows"]] == ["Ada Lovelace"]

    def test_sort_by_category_ascending(self, client, admin_token, db_session, bob, electronics_category, bags_category):
        for cat, title in [(bags_category, "B"), (electronics_category, "E"), (bags_category, "B2")]:
            db_session.add(
                FoundItem(
                    user_id=bob.id,
                    category_id=cat.id,
                    title=title,
                    status=FoundItemStatus.AVAILABLE,
                )
            )
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=found_items&sort_by=category&sort_order=asc",
            headers=_auth(admin_token),
        ).json()
        categories = [r["category"] for r in body["rows"]]
        assert categories == sorted(categories)


# =============================================================================
# Claims report
# =============================================================================


class TestClaimsReport:
    def test_joins_items_claimant_and_officer(
        self, client, admin_token, claim, lost_item, found_item
    ):
        body = client.get(f"{REPORTS}?type=claims", headers=_auth(admin_token)).json()
        assert body["report_type"] == "claims"
        row = next(r for r in body["rows"] if r["id"] == claim.id)
        assert row["lost_item"] == "Silver laptop"
        assert row["found_item"] == "Blue Sony headphones"
        assert row["claimant"] == "Ada Lovelace"
        assert row["officer"] is None
        assert row["verification_status"] == "Pending"
        assert row["status"] == "Active"
        assert row["collected"] is None

    def test_officer_name_joins_when_present(
        self, client, admin_token, db_session, claim, lost_item, found_item, officer
    ):
        claim.officer_id = officer.id
        db_session.commit()

        body = client.get(f"{REPORTS}?type=claims", headers=_auth(admin_token)).json()
        row = next(r for r in body["rows"] if r["id"] == claim.id)
        assert row["officer"] == "Grace Hopper"

    def test_verification_status_filter(
        self, client, admin_token, db_session, claim, lost_item, found_item
    ):
        from app.models.enums import ClaimVerificationStatus

        claim.verification_status = ClaimVerificationStatus.APPROVED
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=claims&verification_status=Approved",
            headers=_auth(admin_token),
        ).json()
        assert [r["id"] for r in body["rows"]] == [claim.id]

    def test_status_filter(self, client, admin_token, db_session, claim, lost_item, found_item):
        from app.models.enums import ClaimStatus

        claim.status = ClaimStatus.CANCELLED
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=claims&status=Cancelled", headers=_auth(admin_token)
        ).json()
        assert [r["id"] for r in body["rows"]] == [claim.id]

    def test_officer_filter(
        self, client, admin_token, db_session, claim, lost_item, found_item, officer
    ):
        claim.officer_id = officer.id
        db_session.commit()

        body = client.get(
            f"{REPORTS}?type=claims&officer_id={officer.id}",
            headers=_auth(admin_token),
        ).json()
        assert [r["id"] for r in body["rows"]] == [claim.id]

    def test_sort_by_claim_date_descending(
        self, client, admin_token, db_session, claim, lost_item, found_item
    ):
        body = client.get(
            f"{REPORTS}?type=claims&sort_by=claim_date&sort_order=desc",
            headers=_auth(admin_token),
        ).json()
        assert [r["id"] for r in body["rows"]][0] == claim.id
