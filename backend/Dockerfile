# TRACE backend — Phase 1 (local) demo image (Module 8 demo kit).
#
# The entrypoint (docker-entrypoint.sh) runs Alembic migrations (and the
# idempotent demo seed) before starting uvicorn, so `docker compose up` is the
# only prerequisite from a clean checkout.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so image rebuilds only re-run pip on a
# requirements.txt change.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code + startup script. .dockerignore keeps .venv/uploads/caches
# out of the image.
COPY . .

EXPOSE 8000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
