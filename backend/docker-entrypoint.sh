#!/bin/sh
# TRACE backend container entrypoint (Module 8 demo kit).
#
# Runs on every container start:
#   1. `alembic upgrade head`   — migrations run automatically, never a manual
#      step. Retried a few times so a just-started `db` healthcheck race cannot
#      fail the boot.
#   2. `python seed.py`         — idempotent demo seed (Module 8 issue 2):
#      categories, one user per role, and demo lost/found items including the
#      deliberately-matching pair. Safe to re-run on every start.
#   3. uvicorn                  — the API itself.
set -e

# Pre-flight: fail loudly on a branched migration history instead of silently
# retrying. `alembic heads` reads only the version scripts (no DB connection),
# so this cannot race the database warm-up below.
echo "[entrypoint] pre-flight: checking alembic migration heads…"
HEADS_COUNT=$(alembic heads 2>/dev/null | grep -c '(head)' || true)
if [ "${HEADS_COUNT}" -gt 1 ]; then
  echo "[entrypoint] FATAL: alembic reports ${HEADS_COUNT} migration heads — the migration history has branched." >&2
  echo "[entrypoint] Fix with 'alembic merge -m \"merge heads\" <head1> <head2>' and re-commit (see Notes.md §6)." >&2
  exit 1
fi

echo "[entrypoint] waiting for the database and applying migrations…"
n=0
until alembic upgrade head; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "[entrypoint] FATAL: alembic upgrade head failed $n times — see the error above." >&2
    exit 1
  fi
  echo "[entrypoint] database not ready yet (attempt $n); retrying in 3s…" >&2
  sleep 3
done
echo "[entrypoint] schema is up to date."

echo "[entrypoint] seeding demo data (idempotent)…"
python seed.py

echo "[entrypoint] starting uvicorn…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
