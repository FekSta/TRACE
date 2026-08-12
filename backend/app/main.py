"""TRACE — FastAPI application entrypoint (modular monolith).

One app, one database, six internal modules (Auth, Items, Matching, Claims,
Dashboard, Notifications) communicating via direct in-process calls — never
HTTP between modules (see `ABOUT.md`).

Run (Phase 1, local):
    cd backend
    .venv/bin/uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI

from app.modules.auth.router import router as auth_router
from app.modules.items.router import router as items_router
from app.modules.matching.router import router as matching_router

app = FastAPI(
    title="TRACE API",
    description=(
        "Tracking, Recovery, And Claim Engine — modular monolith backend "
        "(Phase 1, fully local)."
    ),
    version="0.2.0",
)

app.include_router(auth_router)
app.include_router(items_router)
app.include_router(matching_router)


@app.get("/health", tags=["system"], summary="Liveness probe")
def health() -> dict:
    return {"status": "ok"}
