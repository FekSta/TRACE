"""Items module — Item Management (Module 3).

Category, LostItem, and FoundItem CRUD with role-based scoping, plus (Module 3
issue 2) the `StorageBackend` abstraction, `LocalDiskStorage`, and attachment
uploads. All file I/O goes through `app.modules.items.storage` — never direct
filesystem calls elsewhere in the module.
"""
