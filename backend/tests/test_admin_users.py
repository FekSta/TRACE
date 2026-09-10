from unittest.mock import patch

from app.models import AuditLog, Notification, User
from app.models.enums import NotificationType, UserRole, UserStatus
from app.modules.auth.security import create_access_token, hash_password
from app.modules.notifications import service as notification_service


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user)}"}


def test_admin_can_create_update_delete_and_login_is_blocked(client, db_session, admin):
    headers = auth_headers(admin)
    with patch("app.modules.auth.admin_router.notify_account_created"):
        created = client.post(
            "/admin/users",
            headers=headers,
            json={
                "first_name": "New",
                "last_name": "Officer",
                "email": "new.officer@example.com",
                "password": "Predictable1!",
                "role": "Officer",
            },
        )
    assert created.status_code == 201
    account_id = created.json()["id"]
    assert db_session.query(AuditLog).filter_by(entity_id=account_id).count() == 1

    updated = client.put(
        f"/admin/users/{account_id}",
        headers=headers,
        json={"status": "Inactive", "phone_number": "555-0100"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "Inactive"
    assert db_session.query(AuditLog).filter_by(entity_id=account_id).count() == 2

    login = client.post(
        "/auth/login",
        json={"email": "new.officer@example.com", "password": "Predictable1!"},
    )
    assert login.status_code == 403

    deleted = client.delete(f"/admin/users/{account_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "Inactive"
    assert db_session.query(AuditLog).filter_by(entity_id=account_id).count() == 3


def test_admin_cannot_manage_administrator_or_assign_administrator(client, admin):
    headers = auth_headers(admin)
    created = client.post(
        "/admin/users",
        headers=headers,
        json={
            "first_name": "Allowed",
            "last_name": "User",
            "email": "allowed@example.com",
            "role": "Administrator",
        },
    )
    assert created.status_code == 400

    target = client.post(
        "/admin/users",
        headers=headers,
        json={
            "first_name": "Allowed",
            "last_name": "User",
            "email": "allowed@example.com",
            "role": "User",
        },
    ).json()
    assert client.put(
        f"/admin/users/{target['id']}",
        headers=headers,
        json={"role": "Administrator"},
    ).status_code == 400

    admin_row = client.get("/admin/users", headers=headers).json()
    assert all(row["role"] != "Administrator" for row in admin_row)


def test_user_and_officer_are_forbidden_on_all_admin_user_endpoints(client, user, officer):
    for caller in (user, officer):
        headers = auth_headers(caller)
        assert client.get("/admin/users", headers=headers).status_code == 403
        assert client.post("/admin/users", headers=headers, json={}).status_code == 403
        assert client.put("/admin/users/999999", headers=headers, json={}).status_code == 403
        assert client.delete("/admin/users/999999", headers=headers).status_code == 403


def test_account_notification_row_survives_email_failure(db_session, user):
    account = User(
        first_name="Mail",
        last_name="Failure",
        email="mail.failure@example.com",
        password_hash=hash_password("Predictable1!"),
        role=UserRole.OFFICER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    with patch.object(notification_service, "SessionLocal", return_value=db_session), patch.object(
        notification_service.email_backend, "send", side_effect=OSError("SMTP unavailable")
    ):
        notification_service.notify_account_created(account.id, "Predictable1!")

    row = db_session.query(Notification).filter_by(user_id=account.id).one()
    assert row.notification_type == NotificationType.SYSTEM
    assert "Predictable1!" in row.message