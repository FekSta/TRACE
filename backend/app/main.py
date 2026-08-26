"""TRACE — FastAPI application entrypoint (modular monolith).

One app, one database, six internal modules (Auth, Items, Matching, Claims,
Dashboard, Notifications) communicating via direct in-process calls — never
HTTP between modules (see `ABOUT.md`).

Run (Phase 1, local):
    cd backend
    .venv/bin/uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.auth.router import router as auth_router
from app.modules.claims.router import router as claims_router
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

# Browser CORS for the Phase 1 React SPA (Vite dev server on :5173). Added in
# Module 7 — a one-way allowance for the dev origin only; Module 8/9's hosted
# frontend will extend this list. Not an API-surface change (no new routes).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(items_router)
app.include_router(matching_router)
app.include_router(claims_router)


@app.get("/health", tags=["system"], summary="Liveness probe")
def health() -> dict:
    return {"status": "ok"}
