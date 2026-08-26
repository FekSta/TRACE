"""Storage abstraction — Phase 1 local disk (Module 3, issue 2).

The **only** file-I/O entry point in the Items module. Routes call
``storage.save(...)`` / ``storage.get_url(...)`` / ``storage.delete(...)``
and never touch the filesystem directly.

Module 9 swaps in ``SupabaseStorage`` behind this same interface: ``save``
returns a stored name, ``get_url`` turns it into a fetchable URL (Phase 1:
``/media/<name>`` served by this app; Phase 2: a Supabase public/signed URL),
and ``delete`` removes the object. No Items-module calling code changes.
"""

import abc
import uuid
from pathlib import Path

from app import config


class StorageBackend(abc.ABC):
    """Contract every storage implementation (local, cloud) must satisfy."""

    @abc.abstractmethod
    def save(self, content: bytes, original_filename: str) -> str:
        """Persist ``content`` and return the *stored name* (not a URL)."""

    @abc.abstractmethod
    def get_url(self, stored_name: str) -> str:
        """Return the client-fetchable URL for a stored name."""

    @abc.abstractmethod
    def delete(self, stored_name: str) -> None:
        """Remove the stored object (no-op when absent)."""


class LocalDiskStorage(StorageBackend):
    """Writes files under ``base_dir`` (default ``backend/uploads/``).

    Collision handling: every file is stored as ``<uuid4 hex>_<basename>``,
    so two uploads with the same filename never clash and names are not
    guessable (the UUID doubles as access control for the public /media
    route — see `Review.md` §Module 3).
    """

    def __init__(self, base_dir: Path, base_url: str = "/media") -> None:
        self.base_dir = base_dir
        self.base_url = base_url
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, content: bytes, original_filename: str) -> str:
        safe_name = Path(original_filename).name or "upload"
        stored_name = f"{uuid.uuid4().hex}_{safe_name}"
        (self.base_dir / stored_name).write_bytes(content)
        return stored_name

    def get_url(self, stored_name: str) -> str:
        return f"{self.base_url}/{stored_name}"

    def delete(self, stored_name: str) -> None:
        path = self.base_dir / stored_name
        if path.exists():
            path.unlink()


# Single shared instance for the whole app (configured via UPLOAD_DIR).
storage: StorageBackend = LocalDiskStorage(base_dir=config.UPLOAD_DIR)
