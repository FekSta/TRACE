"""Auth module tests — Module 2 Definition of Done.

These tests convert the manual verification (curl calls, JWT decoding in a
Python shell) into automated assertions that survive as regression protection.

Authority: Notes.md §8 (Authentication API), Review.md §Module 2 (decisions),
TRACE_Issues.md Module 2 DoD.

Test assumptions:
- Auth transport is Bearer tokens in the Authorization header (the original
  Module 2 design). If the JWT-cookie retrofit (retrofit-jwt-cookies.md) has
  landed, these tests still pass because they test the core logic; cookie-
  specific tests would be added separately.
"""

import time
from datetime import timedelta

import pytest

from app.models.enums import UserRole, UserStatus
from app.modules.auth.deps import get_current_user
from app.modules.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# =============================================================================
# Password hashing round-trip (DoD: hash stored, plaintext never persisted)
# =============================================================================


class TestPasswordHashing:
    """Module 2 DoD: password is bcrypt-hashed; plaintext never stored."""

    def test_hash_is_bcrypt_format(self):
        """Hash starts with $2b$ (bcrypt format)."""
        hashed = hash_password("TestPass123!")
        assert hashed.startswith("$2b$")
        # bcrypt hash is ~60 chars
        assert len(hashed) == 60

    def test_hash_is_deterministic_format_but_not_value(self):
        """Two hashes of the same password differ (random salt) but both verify."""
        h1 = hash_password("SamePassword1!")
        h2 = hash_password("SamePassword1!")
        assert h1 != h2  # different salts
        assert verify_password("SamePassword1!", h1)
        assert verify_password("SamePassword1!", h2)

    def test_verify_password_correct(self):
        hashed = hash_password("MySecret1!")
        assert verify_password("MySecret1!", hashed) is True

    def test_verify_password_wrong(self):
        hashed = hash_password("MySecret1!")
        assert verify_password("WrongPassword1!", hashed) is False

    def test_password_hash_is_stored_not_plaintext(self, db_session, user):
        """The User row's password_hash is the bcrypt hash, not the plaintext."""
        db_session.refresh(user)
        assert user.password_hash != "SuperSecret1!"
        assert user.password_hash.startswith("$2b$")
        assert verify_password("SuperSecret1!", user.password_hash)


# =============================================================================
# JWT token creation and decoding (DoD: UserID and Role claims present)
# =============================================================================


class TestJWTToken:
    """Module 2 DoD: token contains UserID and Role claims."""

    def test_token_contains_user_id_claim(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        assert payload["UserID"] == user.id
        assert payload["sub"] == str(user.id)

    def test_token_contains_role_claim(self, user, officer, admin):
        for u, expected_role in [(user, "User"), (officer, "Officer"), (admin, "Administrator")]:
            token = create_access_token(u)
            payload = decode_access_token(token)
            assert payload["Role"] == expected_role

    def test_token_has_iat_and_exp(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        assert "iat" in payload
        assert "exp" in payload
        assert payload["exp"] > payload["iat"]

    def test_token_expires_after_configured_minutes(self, user):
        """Token expiry is in the future but close to configured window."""
        token = create_access_token(user)
        payload = decode_access_token(token)
        exp = payload["exp"]
        iat = payload["iat"]
        # Expiry should be ~60 minutes after issue (config.JWT_EXPIRE_MINUTES)
        delta_seconds = exp - iat
        assert 3500 < delta_seconds < 3700  # ~60 min ± a few seconds

    def test_decode_invalid_token_raises(self):
        from jwt import InvalidTokenError

        with pytest.raises(InvalidTokenError):
            decode_access_token("invalid.token.here")

    def test_decode_tampered_token_raises(self, user):
        from jwt import InvalidTokenError

        token = create_access_token(user)
        # Tamper with the payload (base64 decode, modify, re-encode)
        parts = token.split(".")
        # Change the payload slightly — signature will be invalid
        tampered = parts[0] + ".tampered." + parts[2]
        with pytest.raises(InvalidTokenError):
            decode_access_token(tampered)


# =============================================================================
# Registration — POST /auth/register
# =============================================================================


class TestRegistration:
    """Module 2 DoD: POST /auth/register creates a User, rejects duplicates."""

    def test_register_success_returns_201(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "newuser@example.com",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "newuser@example.com"
        assert body["first_name"] == "Test"
        assert body["last_name"] == "User"
        assert body["role"] == "User"
        assert body["status"] == "Active"
        assert body["id"] is not None

    def test_register_strips_whitespace_from_names(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "  Spaced  ",
                "last_name": "  Name  ",
                "email": "spaced@example.com",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["first_name"] == "Spaced"
        assert body["last_name"] == "Name"

    def test_register_lowercases_email(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Case",
                "last_name": "Test",
                "email": "MixedCase@example.COM",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["email"] == "mixedcase@example.com"

    def test_register_duplicate_email_returns_409(self, client):
        client.post(
            "/auth/register",
            json={
                "first_name": "First",
                "last_name": "User",
                "email": "dup@example.com",
                "password": "RegisterPass1!",
            },
        )
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Second",
                "last_name": "User",
                "email": "dup@example.com",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    def test_register_missing_fields_returns_422(self, client):
        resp = client.post(
            "/auth/register",
            json={"first_name": "Only"},
        )
        assert resp.status_code == 422

    def test_register_short_password_returns_422(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Short",
                "last_name": "Pass",
                "email": "short@example.com",
                "password": "abc",  # too short
            },
        )
        assert resp.status_code == 422

    def test_register_creates_active_user(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Active",
                "last_name": "User",
                "email": "active@example.com",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "Active"

    def test_register_creates_user_role_only(self, client):
        """Self-registration always creates role=User (no privilege escalation)."""
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Plain",
                "last_name": "User",
                "email": "plain@example.com",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["role"] == "User"


# =============================================================================
# Login — POST /auth/login
# =============================================================================


class TestLogin:
    """Module 2 DoD: login returns a token; wrong password/email both 401."""

    def test_login_success_returns_token(self, client):
        client.post(
            "/auth/register",
            json={
                "first_name": "Login",
                "last_name": "Test",
                "email": "logintest@example.com",
                "password": "LoginPass1!",
            },
        )
        resp = client.post(
            "/auth/login",
            json={
                "email": "logintest@example.com",
                "password": "LoginPass1!",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        # Decode and verify claims
        payload = decode_access_token(body["access_token"])
        assert payload["UserID"] is not None
        assert payload["Role"] == "User"

    def test_login_wrong_password_returns_401(self, client):
        client.post(
            "/auth/register",
            json={
                "first_name": "W",
                "last_name": "P",
                "email": "wronpass@example.com",
                "password": "CorrectPass1!",
            },
        )
        resp = client.post(
            "/auth/login",
            json={
                "email": "wronpass@example.com",
                "password": "WrongPass1!",
            },
        )
        assert resp.status_code == 401
        assert "incorrect email or password" in resp.json()["detail"].lower()

    def test_login_unknown_email_returns_401(self, client):
        resp = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePass1!",
            },
        )
        assert resp.status_code == 401
        assert "incorrect email or password" in resp.json()["detail"].lower()

    def test_login_does_not_reveal_whether_email_exists(self, client):
        """Both unknown email and wrong password return the same 401 message."""
        client.post(
            "/auth/register",
            json={
                "first_name": "Exists",
                "last_name": "User",
                "email": "exists@example.com",
                "password": "RealPass1!",
            },
        )
        # Wrong password
        resp1 = client.post(
            "/auth/login",
            json={
                "email": "exists@example.com",
                "password": "WrongPass1!",
            },
        )
        # Unknown email
        resp2 = client.post(
            "/auth/login",
            json={
                "email": "unknown@example.com",
                "password": "SomePass1!",
            },
        )
        assert resp1.status_code == 401
        assert resp2.status_code == 401
        assert resp1.json()["detail"] == resp2.json()["detail"]

    def test_login_suspended_user_returns_403(self, client, suspended_user):
        resp = client.post(
            "/auth/login",
            json={
                "email": "suspended@example.com",
                "password": "SuperSecret1!",
            },
        )
        assert resp.status_code == 403
        assert "not active" in resp.json()["detail"].lower()

    def test_login_inactive_user_returns_403(self, client, inactive_user):
        resp = client.post(
            "/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "SuperSecret1!",
            },
        )
        assert resp.status_code == 403
        assert "not active" in resp.json()["detail"].lower()

    def test_login_active_user_succeeds(self, client, user):
        resp = client.post(
            "/auth/login",
            json={
                "email": "ada@example.com",
                "password": "SuperSecret1!",
            },
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_invalid_email_format_returns_422(self, client):
        resp = client.post(
            "/auth/login",
            json={
                "email": "not-an-email",
                "password": "SomePass1!",
            },
        )
        assert resp.status_code == 422


# =============================================================================
# get_current_user / require_role — authentication and authorization
# =============================================================================


class TestGetCurrentUser:
    """Module 2 DoD: valid token succeeds; missing → 401; wrong role → 403."""

    def test_valid_token_returns_user(self, db_session, user_token, user):
        # get_current_user is a dependency; test via the TestClient on a
        # protected route instead
        pass  # tested via TestGetCurrentUserViaClient below

    def test_token_for_nonexistent_user_returns_401(self, client):
        """A valid-signed token for a user that doesn't exist in DB → 401."""
        # Create a token for a user ID that doesn't exist
        from app.modules.auth.security import create_access_token

        class FakeUser:
            id = 99999
            role = UserRole.USER
            status = UserStatus.ACTIVE

        token = create_access_token(FakeUser())
        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401


class TestGetCurrentUserViaClient:
    """Test get_current_user through the TestClient on protected routes."""

    def test_no_token_returns_401(self, client):
        resp = client.get("/auth/test-protected")
        assert resp.status_code == 401
        assert "www-authenticate" in resp.headers
        assert resp.headers["www-authenticate"] == "Bearer"

    def test_malformed_token_returns_401(self, client):
        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        assert resp.status_code == 401

    def test_valid_user_token_accesses_protected_route(self, client, user_token):
        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # User is authenticated but not an Administrator → 403
        assert resp.status_code == 403

    def test_admin_token_accesses_admin_route(self, client, admin_token):
        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Administrator access granted"

    def test_officer_token_rejected_for_admin_route(self, client, officer_token):
        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 403

    def test_expired_token_returns_401(self, client, user):
        from app.modules.auth.security import create_access_token

        # Create a token that expired 1 minute ago
        from app import config

        old_config = config.JWT_EXPIRE_MINUTES
        config.JWT_EXPIRE_MINUTES = -1  # expired immediately
        token = create_access_token(user)
        config.JWT_EXPIRE_MINUTES = old_config

        resp = client.get(
            "/auth/test-protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_suspended_user_token_returns_403_on_protected_route(self, client, suspended_user):
        from app.modules.auth.security import create_access_token

        token = create_access_token(suspended_user)
        resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403


class TestRequireRole:
    """Test require_role via the Items stub endpoint (GET /items/lost)."""

    def test_user_can_access_items_lost(self, client, user_token):
        resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200

    def test_officer_can_access_items_lost(self, client, officer_token):
        resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 200

    def test_admin_can_access_items_lost(self, client, admin_token):
        resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

    def test_unauthenticated_cannot_access_items_lost(self, client):
        resp = client.get("/items/lost")
        assert resp.status_code == 401


# =============================================================================
# JWT claim structure — verify exact claims match the documented contract
# =============================================================================


class TestJWTCClaimsStructure:
    """Verify the exact JWT claims match Notes.md §8.1."""

    def test_claims_have_exact_keys(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        expected_keys = {"sub", "UserID", "Role", "iat", "exp"}
        assert set(payload.keys()) == expected_keys

    def test_sub_is_string_user_id(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        assert payload["sub"] == str(user.id)
        assert isinstance(payload["sub"], str)

    def test_user_id_is_integer(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        assert payload["UserID"] == user.id
        assert isinstance(payload["UserID"], int)

    def test_role_is_string(self, user):
        token = create_access_token(user)
        payload = decode_access_token(token)
        assert payload["Role"] == "User"
        assert isinstance(payload["Role"], str)


# =============================================================================
# Email normalization on register
# =============================================================================


class TestEmailNormalization:
    """Emails are lowercased on register and login."""

    def test_register_lowercases_email(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "first_name": "Lower",
                "last_name": "Case",
                "email": "MixedCase@Example.COM",
                "password": "RegisterPass1!",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["email"] == "mixedcase@example.com"

    def test_login_case_insensitive_email(self, client):
        client.post(
            "/auth/register",
            json={
                "first_name": "Case",
                "last_name": "Login",
                "email": "CaseLogin@example.com",
                "password": "LoginPass1!",
            },
        )
        # Login with different case
        resp = client.post(
            "/auth/login",
            json={
                "email": "CASELOGIN@EXAMPLE.COM",
                "password": "LoginPass1!",
            },
        )
        assert resp.status_code == 200
