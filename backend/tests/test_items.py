"""Items module tests — Module 3 Definition of Done.

Authority: Notes.md §9 (Item Management API), Review.md §Module 3 (decisions),
TRACE_Issues.md Module 3 DoD.

Test assumptions:
- Category mutations are Administrator-only; listing is open to any authenticated role.
- DELETE /categories/{id} archives (Status → Archived), never hard-deletes.
- Items are scoped: User sees own, Officer/Admin see all; cross-user → 404.
- Status defaults: LostItem → Reported, FoundItem → Available on creation.
- LocalDiskStorage writes to a temp directory; Attachment row stores only a URL.
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.models.enums import (
    CategoryStatus,
    FoundItemStatus,
    LostItemStatus,
    RelatedEntity,
    UserRole,
)
from app.modules.items.storage import LocalDiskStorage, StorageBackend


# =============================================================================
# Category CRUD
# =============================================================================


class TestCategoryList:
    """GET /categories — any authenticated role sees active categories."""

    def test_unauthenticated_cannot_list_categories(self, client):
        resp = client.get("/categories")
        assert resp.status_code == 401

    def test_user_can_list_active_categories(self, client, user_token, electronics_category):
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        # Should include the seeded Electronics category
        names = [c["category_name"] for c in body]
        assert "Electronics" in names

    def test_officer_can_list_active_categories(self, client, officer_token, electronics_category):
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_admin_can_list_active_categories(self, client, admin_token, electronics_category):
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_admin_can_include_archived_categories(self, client, admin_token, electronics_category):
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"include_archived": True},
        )
        assert resp.status_code == 200

    def test_user_cannot_include_archived_categories(self, client, user_token, electronics_category):
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {user_token}"},
            params={"include_archived": True},
        )
        assert resp.status_code == 403


class TestCategoryCreate:
    """POST /categories — Administrator only."""

    def test_admin_can_create_category(self, client, admin_token):
        resp = client.post(
            "/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "category_name": "Sports Gear",
                "description": "Sporting equipment",
                "icon": "sports",
                "display_order": 5,
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["category_name"] == "Sports Gear"
        assert body["status"] == "Active"
        assert body["id"] is not None

    def test_user_cannot_create_category(self, client, user_token):
        resp = client.post(
            "/categories",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_name": "Sports Gear",
                "description": "Sporting equipment",
            },
        )
        assert resp.status_code == 403

    def test_duplicate_category_name_returns_409(self, client, admin_token, electronics_category):
        resp = client.post(
            "/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "category_name": "Electronics",
                "description": "Duplicate",
            },
        )
        assert resp.status_code == 409

    def test_create_category_missing_name_returns_422(self, client, admin_token):
        resp = client.post(
            "/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"description": "No name"},
        )
        assert resp.status_code == 422


class TestCategoryUpdate:
    """PATCH /categories/{id} — Administrator only."""

    def test_admin_can_update_category(self, client, admin_token, electronics_category):
        resp = client.patch(
            f"/categories/{electronics_category.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    def test_admin_can_archive_category_via_update(self, client, admin_token, electronics_category):
        resp = client.patch(
            f"/categories/{electronics_category.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "Archived"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "Archived"

    def test_user_cannot_update_category(self, client, user_token, electronics_category):
        resp = client.patch(
            f"/categories/{electronics_category.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"description": "Hacked"},
        )
        assert resp.status_code == 403

    def test_update_nonexistent_category_returns_404(self, client, admin_token):
        resp = client.patch(
            "/categories/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"description": "Ghost"},
        )
        assert resp.status_code == 404


class TestCategoryArchive:
    """DELETE /categories/{id} — archives (soft delete), Administrator only."""

    def test_admin_can_archive_category(self, client, admin_token, electronics_category):
        resp = client.delete(
            f"/categories/{electronics_category.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "Archived"

    def test_archived_category_not_in_active_list(
        self, client, user_token, admin_token, electronics_category
    ):
        # First archive it
        client.delete(
            f"/categories/{electronics_category.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Now list active categories — should not include it
        resp = client.get(
            "/categories",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        names = [c["category_name"] for c in resp.json()]
        assert "Electronics" not in names


# =============================================================================
# LostItem CRUD
# =============================================================================


class TestLostItemCreate:
    """POST /items/lost — any authenticated role; status defaults to Reported."""

    def test_user_can_report_lost_item(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Silver laptop",
                "description": "MacBook Pro",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == "Silver laptop"
        assert body["status"] == "Reported"
        assert body["user_id"] is not None

    def test_lost_item_status_defaults_to_reported(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Test item",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "Reported"

    def test_officer_can_report_lost_item(self, client, officer_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Officer's lost item",
            },
        )
        assert resp.status_code == 201

    def test_unauthenticated_cannot_report_lost_item(self, client, electronics_category):
        resp = client.post(
            "/items/lost",
            json={
                "category_id": electronics_category.id,
                "title": "No token",
            },
        )
        assert resp.status_code == 401

    def test_invalid_category_returns_400(self, client, user_token):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": 99999,
                "title": "Bad category",
            },
        )
        assert resp.status_code == 400


class TestLostItemList:
    """GET /items/lost — scoped: User sees own, Officer/Admin see all."""

    def test_user_sees_only_own_lost_items(
        self, client, user_token, bob_token, electronics_category
    ):
        # User reports an item
        user_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "User's item",
            },
        )
        user_item_id = user_resp.json()["id"]

        # Bob reports an item
        bob_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {bob_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Bob's item",
            },
        )
        bob_item_id = bob_resp.json()["id"]

        # User lists — should see only their own
        list_resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        items = list_resp.json()
        ids = [item["id"] for item in items]
        assert user_item_id in ids
        assert bob_item_id not in ids

    def test_officer_sees_all_lost_items(self, client, officer_token, user_token, electronics_category):
        # User reports an item
        client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "User's item",
            },
        )

        # Officer lists — should see all
        list_resp = client.get(
            "/items/lost",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        items = list_resp.json()
        titles = [item["title"] for item in items]
        assert "User's item" in titles


class TestLostItemGetUpdateDelete:
    """GET|PATCH|DELETE /items/lost/{id} — scoped, cross-user → 404."""

    def test_user_can_get_own_lost_item(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "My item",
            },
        )
        item_id = resp.json()["id"]

        get_resp = client.get(
            f"/items/lost/{item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == "My item"

    def test_user_cannot_get_another_users_lost_item(
        self, client, user_token, bob_token, electronics_category
    ):
        # Bob creates an item
        bob_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {bob_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Bob's secret item",
            },
        )
        bob_item_id = bob_resp.json()["id"]

        # User tries to get it → 404
        resp = client.get(
            f"/items/lost/{bob_item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    def test_officer_can_get_any_lost_item(self, client, officer_token, user_token, electronics_category):
        # User creates an item
        user_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "User's item",
            },
        )
        user_item_id = user_resp.json()["id"]

        # Officer gets it
        resp = client.get(
            f"/items/lost/{user_item_id}",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 200

    def test_user_can_update_own_lost_item(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Original title",
            },
        )
        item_id = resp.json()["id"]

        update_resp = client.patch(
            f"/items/lost/{item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"title": "Updated title"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "Updated title"

    def test_user_can_delete_own_lost_item(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "To be deleted",
            },
        )
        item_id = resp.json()["id"]

        delete_resp = client.delete(
            f"/items/lost/{item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert delete_resp.status_code == 204

        # Verify it's gone
        get_resp = client.get(
            f"/items/lost/{item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert get_resp.status_code == 404

    def test_officer_can_delete_any_lost_item(self, client, officer_token, user_token, electronics_category):
        # User creates an item
        user_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "User's item to delete",
            },
        )
        user_item_id = user_resp.json()["id"]

        # Officer deletes it
        resp = client.delete(
            f"/items/lost/{user_item_id}",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 204


# =============================================================================
# FoundItem CRUD
# =============================================================================


class TestFoundItemCreate:
    """POST /items/found — any authenticated role; status defaults to Available."""

    def test_user_can_register_found_item(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/found",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Blue Sony headphones",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == "Blue Sony headphones"
        assert body["status"] == "Available"

    def test_found_item_status_defaults_to_available(self, client, user_token, electronics_category):
        resp = client.post(
            "/items/found",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Test found item",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "Available"


class TestFoundItemList:
    """GET /items/found — scoped: User sees own, Officer/Admin see all."""

    def test_user_sees_only_own_found_items(
        self, client, user_token, bob_token, electronics_category
    ):
        # User registers a found item
        user_resp = client.post(
            "/items/found",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "User's found item",
            },
        )
        user_item_id = user_resp.json()["id"]

        # Bob registers a found item
        bob_resp = client.post(
            "/items/found",
            headers={"Authorization": f"Bearer {bob_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Bob's found item",
            },
        )
        bob_item_id = bob_resp.json()["id"]

        # User lists — should see only their own
        list_resp = client.get(
            "/items/found",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        items = list_resp.json()
        ids = [item["id"] for item in items]
        assert user_item_id in ids
        assert bob_item_id not in ids


class TestFoundItemGetUpdateDelete:
    """GET|PATCH|DELETE /items/found/{id} — scoped, cross-user → 404."""

    def test_user_cannot_get_another_users_found_item(
        self, client, user_token, bob_token, electronics_category
    ):
        # Bob registers a found item
        bob_resp = client.post(
            "/items/found",
            headers={"Authorization": f"Bearer {bob_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Bob's secret found item",
            },
        )
        bob_item_id = bob_resp.json()["id"]

        # User tries to get it → 404
        resp = client.get(
            f"/items/found/{bob_item_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404


# =============================================================================
# StorageBackend — LocalDiskStorage
# =============================================================================


class TestLocalDiskStorage:
    """Test LocalDiskStorage against a temp directory."""

    def test_save_returns_stored_name(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            name = storage.save(b"test content", "test.txt")
            assert name.endswith("_test.txt")
            assert len(name) > len("_test.txt")  # UUID prefix present

    def test_save_persists_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            name = storage.save(b"hello world", "data.txt")
            path = os.path.join(tmpdir, name)
            assert os.path.exists(path)
            with open(path, "rb") as f:
                assert f.read() == b"hello world"

    def test_get_url_returns_url(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            name = storage.save(b"content", "file.txt")
            url = storage.get_url(name)
            assert url == f"/media/{name}"

    def test_delete_removes_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            name = storage.save(b"content", "delete_me.txt")
            assert os.path.exists(os.path.join(tmpdir, name))
            storage.delete(name)
            assert not os.path.exists(os.path.join(tmpdir, name))

    def test_delete_nonexistent_is_noop(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            storage.delete("nonexistent_file.txt")  # should not raise

    def test_save_handles_collision_with_uuid_prefix(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalDiskStorage(base_dir=Path(tmpdir))
            name1 = storage.save(b"content1", "same_name.txt")
            name2 = storage.save(b"content2", "same_name.txt")
            assert name1 != name2  # UUID prefixes differ
            assert os.path.exists(os.path.join(tmpdir, name1))
            assert os.path.exists(os.path.join(tmpdir, name2))

    def test_storage_is_singleton(self):
        """The shared `storage` singleton is a LocalDiskStorage instance."""
        from app.modules.items.storage import storage as app_storage
        assert isinstance(app_storage, LocalDiskStorage)


# =============================================================================
# Attachment — stores only URL, never bytes
# =============================================================================


class TestAttachmentStoresURL:
    """The Attachment row stores only the URL (file_path), never bytes."""

    def test_attachment_file_path_is_url_not_bytes(self, client, user_token, electronics_category):
        # Create a lost item
        item_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Item with attachment",
            },
        )
        item_id = item_resp.json()["id"]

        # Upload an attachment (multipart)
        import io

        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        att_resp = client.post(
            f"/items/lost/{item_id}/attachments",
            headers={"Authorization": f"Bearer {user_token}"},
            files=files,
        )
        assert att_resp.status_code == 201
        att = att_resp.json()

        # The Attachment row's file_path is a URL, not bytes
        assert att["file_path"].startswith("/media/")
        assert "hello world" not in att["file_path"]  # bytes not stored in DB

    def test_attachment_retrieves_file_via_url(self, client, user_token, electronics_category):
        # Create a lost item
        item_resp = client.post(
            "/items/lost",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "category_id": electronics_category.id,
                "title": "Item for media test",
            },
        )
        item_id = item_resp.json()["id"]

        # Upload
        import io

        files = {"file": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
        att_resp = client.post(
            f"/items/lost/{item_id}/attachments",
            headers={"Authorization": f"Bearer {user_token}"},
            files=files,
        )
        att = att_resp.json()
        file_url = att["file_path"]

        # Fetch via the media route
        media_resp = client.get(file_url)
        assert media_resp.status_code == 200
        assert media_resp.content == b"hello world"
