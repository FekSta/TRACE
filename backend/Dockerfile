# TRACE backend — Phase 1 (local) demo image (Module 8 demo kit).
#
# The entrypoint (docker-entrypoint.sh) runs Alembic migrations (and the
# idempotent demo seed) before starting uvicorn, so `docker compose up` is the
# only prerequisite from a clean checkout.
#
# The Python base image is pinned to the exact patch version verified in the
# demo (3.14.6) and requirements.txt is the pip-compiled LOCKFILE (all
# transitive versions pinned ==, generated from requirements.in) — see
# Review.md §Module 8.
FROM python:3.14.6-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so image rebuilds only re-run pip on a
# lockfile change. requirements.txt is the version-pinned lock (see
# requirements.in for the human-readable spec).
COPY requirements.in requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code + startup script. .dockerignore keeps .venv/uploads/caches
# out of the image.
COPY . .

EXPOSE 8000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
