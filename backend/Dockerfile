# TRACE backend — Phase 1 (local) demo image (Module 8 demo kit).
#
# The entrypoint (docker-entrypoint.sh) runs Alembic migrations (and the
# idempotent demo seed) before starting uvicorn, so `docker compose up` is the
# only prerequisite from a clean checkout.
#
# The Python base image is pinned to the exact patch version verified in the
# demo (3.14.6) and requirements/base.txt is the hash-pinned pip-compiled
# lockfile generated from requirements/base.in — see Review.md.
FROM python:3.14.6-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so image rebuilds only re-run pip on a
# lockfile change. requirements/base.txt is the hash-pinned lock (see
# requirements/base.in for the human-readable spec).
COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir --require-hashes -r requirements/base.txt

# Application code + startup script. .dockerignore keeps .venv/uploads/caches
# out of the image.
COPY . .

EXPOSE 8000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
