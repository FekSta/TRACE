"""Auth module — user registration, login, JWT issuance (Module 2).

Part of the TRACE modular monolith: an internal package of the single FastAPI
app, not a separate service. Other modules consume ``app.modules.auth.deps``
(``get_current_user`` / ``require_role``) for role-based access control.
"""
