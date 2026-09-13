"""Display enrichment — names/titles instead of raw IDs (Slice A + A.2).

Authority: `prompts/agent-prompt-display-names-all-screens.md`.

Rules under test:

- Item and claim responses carry human labels so no screen prints a raw ID.
- `category_name` and item titles are safe for **every** caller (all roles can
  read categories; a claim/match is inherently about its item pairing).
- Person names (`reporter_name`, `claimant_name`, `officer_name`,
  `lost_reporter_name`, `found_reporter_name`) are populated for **staff** on
  any row and for a plain `User` only on **their own** row; another user's name
  is never returned.
- Scoping is unchanged — cross-user row access is still `404`.
"""

from app.models.enums import ClaimVerificationStatus, UserRole


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# LostItem
# ---------------------------------------------------------------------------


def test_officer_sees_names_on_lost_items(client, officer_token, lost_item, user):
    resp = client.get("/items/lost", headers=_h(officer_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == lost_item.id)
    assert row["user_id"] == user.id
    assert row["reporter_name"] == "Ada Lovelace"
    assert row["category_name"] == "Electronics"


def test_admin_sees_names_on_lost_items(client, admin_token, lost_item):
    resp = client.get("/items/lost", headers=_h(admin_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == lost_item.id)
    assert row["reporter_name"] == "Ada Lovelace"


def test_owner_sees_own_name_and_category_on_lost_items(client, user_token, lost_item):
    """Decision 1: a User gets their **own** name on their own rows (no leak),
    so the portal never has to fall back to `User #id`."""
    resp = client.get("/items/lost", headers=_h(user_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == lost_item.id)
    assert row["reporter_name"] == "Ada Lovelace"
    assert row["category_name"] == "Electronics"


def test_other_user_list_never_leaks_a_name(client, bob_token, lost_item):
    resp = client.get("/items/lost", headers=_h(bob_token))
    assert resp.status_code == 200
    assert all(r["reporter_name"] is None for r in resp.json())
    assert "Ada Lovelace" not in resp.text


def test_get_one_lost_item_is_enriched(client, officer_token, lost_item):
    resp = client.get(f"/items/lost/{lost_item.id}", headers=_h(officer_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["reporter_name"] == "Ada Lovelace"
    assert body["category_name"] == "Electronics"


def test_create_lost_item_response_carries_own_name(
    client, user_token, electronics_category
):
    resp = client.post(
        "/items/lost",
        headers=_h(user_token),
        json={"category_id": electronics_category.id, "title": "Test laptop"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["reporter_name"] == "Ada Lovelace"
    assert body["category_name"] == "Electronics"


def test_patch_lost_item_response_is_enriched(client, user_token, lost_item):
    resp = client.patch(
        f"/items/lost/{lost_item.id}", headers=_h(user_token), json={"title": "Renamed"}
    )
    assert resp.status_code == 200
    assert resp.json()["reporter_name"] == "Ada Lovelace"
    assert resp.json()["category_name"] == "Electronics"


def test_cross_user_item_access_is_404_without_a_name(client, bob_token, lost_item):
    resp = client.get(f"/items/lost/{lost_item.id}", headers=_h(bob_token))
    assert resp.status_code == 404
    assert "Ada" not in resp.text


# ---------------------------------------------------------------------------
# FoundItem
# ---------------------------------------------------------------------------


def test_officer_sees_names_on_found_items(client, officer_token, found_item, bob):
    resp = client.get("/items/found", headers=_h(officer_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == found_item.id)
    assert row["user_id"] == bob.id
    assert row["reporter_name"] == "Bob Builder"
    assert row["category_name"] == "Electronics"


def test_owner_sees_own_name_on_found_items(client, bob_token, found_item):
    resp = client.get("/items/found", headers=_h(bob_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == found_item.id)
    assert row["reporter_name"] == "Bob Builder"


# ---------------------------------------------------------------------------
# Claims
# ---------------------------------------------------------------------------


def test_officer_sees_names_and_titles_on_claims(
    client, officer_token, db_session, claim, officer, user, lost_item, found_item
):
    claim.officer_id = officer.id
    db_session.commit()

    resp = client.get("/claims", headers=_h(officer_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == claim.id)
    assert row["claimant_name"] == "Ada Lovelace"
    assert row["officer_name"] == "Grace Hopper"
    assert row["lost_item_title"] == "Silver laptop"
    assert row["found_item_title"] == "Blue Sony headphones"


def test_claimant_sees_own_name_and_titles_but_not_the_officer(
    client, db_session, user_token, claim, officer, lost_item, found_item
):
    claim.officer_id = officer.id
    db_session.commit()

    resp = client.get("/claims", headers=_h(user_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == claim.id)
    assert row["claimant_name"] == "Ada Lovelace"
    assert row["officer_name"] is None
    assert row["lost_item_title"] == "Silver laptop"
    assert row["found_item_title"] == "Blue Sony headphones"


def test_other_user_claim_list_never_leaks_a_name(client, bob_token, claim):
    resp = client.get("/claims", headers=_h(bob_token))
    assert resp.status_code == 200
    assert "Ada Lovelace" not in resp.text
    assert all(r["claimant_name"] is None and r["officer_name"] is None for r in resp.json())


def test_get_one_claim_is_enriched(client, officer_token, claim):
    resp = client.get(f"/claims/{claim.id}", headers=_h(officer_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["claimant_name"] == "Ada Lovelace"
    assert body["lost_item_title"] == "Silver laptop"


def test_verify_response_is_enriched(client, officer_token, claim):
    resp = client.post(
        f"/claims/{claim.id}/verify",
        headers=_h(officer_token),
        json={"result": "Approved", "notes": "verified"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["verification_status"] == ClaimVerificationStatus.APPROVED.value
    assert body["claimant_name"] == "Ada Lovelace"
    assert body["officer_name"] == "Grace Hopper"
    assert body["lost_item_title"] == "Silver laptop"


def test_collect_response_is_enriched(client, officer_token, claim):
    client.post(
        f"/claims/{claim.id}/verify",
        headers=_h(officer_token),
        json={"result": "Approved"},
    )
    resp = client.post(
        f"/claims/{claim.id}/collect", headers=_h(officer_token), json={}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["claimant_name"] == "Ada Lovelace"
    assert body["found_item_title"] == "Blue Sony headphones"


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------


def test_officer_sees_titles_and_names_on_matches(
    client, officer_token, match, lost_item, found_item
):
    resp = client.get("/matches", headers=_h(officer_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == match.id)
    assert row["lost_item_title"] == "Silver laptop"
    assert row["found_item_title"] == "Blue Sony headphones"
    assert row["lost_reporter_name"] == "Ada Lovelace"
    assert row["found_reporter_name"] == "Bob Builder"


def test_user_sees_match_titles_but_no_other_users_name(
    client, user_token, match, lost_item, found_item
):
    resp = client.get("/matches", headers=_h(user_token))
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["id"] == match.id)
    assert row["lost_item_title"] == "Silver laptop"
    assert row["found_item_title"] == "Blue Sony headphones"
    assert row["lost_reporter_name"] is None
    assert row["found_reporter_name"] is None


def test_accept_match_response_is_enriched(client, user_token, match):
    resp = client.post(f"/matches/{match.id}/accept", headers=_h(user_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["lost_item_title"] == "Silver laptop"
    assert body["found_item_title"] == "Blue Sony headphones"
    # A plain User still never sees the counterparty's name.
    assert body["lost_reporter_name"] is None
    assert body["found_reporter_name"] is None


def test_reject_match_response_is_enriched(client, user_token, match):
    resp = client.post(f"/matches/{match.id}/reject", headers=_h(user_token))
    assert resp.status_code == 200
    assert resp.json()["found_item_title"] == "Blue Sony headphones"


# ---------------------------------------------------------------------------
# Batched lookups + role helper
# ---------------------------------------------------------------------------


def test_load_reporter_names_is_a_batched_lookup(db_session, user, bob):
    from app.modules.items.service import load_reporter_names

    assert load_reporter_names(db_session, {user.id, bob.id}) == {
        user.id: "Ada Lovelace",
        bob.id: "Bob Builder",
    }
    assert load_reporter_names(db_session, set()) == {}


def test_load_category_names_is_a_batched_lookup(db_session, electronics_category):
    from app.modules.items.service import load_category_names

    assert load_category_names(db_session, {electronics_category.id}) == {
        electronics_category.id: "Electronics"
    }
    assert load_category_names(db_session, set()) == {}


def test_staff_role_check_matches_officer_and_admin(officer, admin, user):
    from app.modules.items.service import is_staff

    assert is_staff(officer) is True
    assert is_staff(admin) is True
    assert is_staff(user) is False
    assert officer.role is UserRole.OFFICER
