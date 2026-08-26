"""Email abstraction — Phase 1 SMTP via the local Mailpit catcher (Module 6).

The **only** email-sending entry point in TRACE. Trigger code calls
``email_backend.send(...)`` and never talks to SMTP directly — mirroring how
the Items module calls ``storage.save(...)`` and never touches the filesystem
(`backend/app/modules/items/storage.py`).

Module 9 swaps in ``ResendEmailBackend`` behind this same interface: only a
new implementation file and the ``EMAIL_BACKEND`` env var change — no calling
code does (see `ABOUT.md`'s single notification channel: email only).
"""

import abc
import smtplib
from email.message import EmailMessage

from app import config


class EmailBackend(abc.ABC):
    """Contract every email implementation (local SMTP, cloud) must satisfy."""

    @abc.abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        """Deliver a plain-text email.

        Raises on failure — the caller decides how to handle it (Module 6
        callers log the failure and move on; the `Notification` row is never
        rolled back because of a failed send).
        """


class SmtpEmailBackend(EmailBackend):
    """Sends via SMTP — Phase 1 target is the local Mailpit catcher, so every
    email stays on the machine (zero external network calls)."""

    def __init__(self, host: str, port: int, from_address: str) -> None:
        self.host = host
        self.port = port
        self.from_address = from_address

    def send(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"] = self.from_address
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(self.host, self.port, timeout=5) as server:
            server.send_message(msg)


def _build_backend() -> EmailBackend:
    """Select the active implementation via the ``EMAIL_BACKEND`` env var."""
    kind = config.EMAIL_BACKEND
    if kind == "smtp":
        return SmtpEmailBackend(
            host=config.SMTP_HOST,
            port=config.SMTP_PORT,
            from_address=config.SMTP_FROM,
        )
    # Module 9: kind == "resend" -> ResendEmailBackend(...)
    raise ValueError(f"Unknown EMAIL_BACKEND: {kind!r} (expected 'smtp')")


# Single shared instance for the whole app (configured via env vars).
email_backend: EmailBackend = _build_backend()
