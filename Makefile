# TRACE — demo kit Makefile (Module 8).
#
# `make demo` is the ONE command that brings up the whole system from a clean
# checkout: it builds the four images, starts them (db first — the backend
# waits on its healthcheck), runs the Alembic migrations and the idempotent
# demo seed automatically inside the backend container, and waits until the
# API answers /health. See Tutorial.md for URLs and logins.
#
# Backend dependencies are layered under backend/requirements/ (pip-tools):
#   base.in  -> base.txt   runtime deps the app actually needs in production
#   local.in -> local.txt  base.txt + local dev tooling (alembic CLI, ruff,
#                           pip-tools, etc.) — installed into backend/.venv
#   test.in  -> test.txt   base.txt + test-only deps (pytest, pytest-asyncio,
#                           pytest-cov) — installed on top of .venv for `make test-backend`
# The backend Docker image itself should only ever install requirements/base.txt.
#
# Load the repo-root `.env` (gitignored) so local dev/test targets source the
# same credentials as docker-compose. The `-` prefix means a missing `.env` is
# fine (compose inlines its own defaults); targets that need credentials
# (e.g. test-backend) document that requirement.
-include .env

.PHONY: demo seed up down clean logs ps \
	venv check-env check-migrations migrate-backend \
	update-requirements-backend update-requirements-frontend update-requirements \
	test-frontend test-backend test \
	lint-backend lint-backend-fix

demo: ## Build, start, migrate and seed the full stack, then wait until ready
	docker compose up --build -d
	@echo ""
	@echo "Waiting for the backend to be ready (first build can take a few minutes)…"
	@i=0; until curl -fs http://localhost:8000/health >/dev/null 2>&1; do \
	  i=$$((i + 1)); \
	  if [ $$i -ge 90 ]; then \
	    echo "Backend did not become ready in time — check: docker compose logs backend"; \
	    exit 1; \
	  fi; \
	  sleep 2; \
done
	@echo ""
	@echo "Running demo seed (idempotent)…"
	make seed
	@echo ""
	@echo "TRACE is up 🧭"
	@echo "  Frontend   http://localhost:5173"
	@echo "  API docs   http://localhost:8000/docs"
	@echo "  Mailpit    http://localhost:8025"
	@echo ""
	@echo "Seeded logins (see Tutorial.md):"
	@echo "  ada@example.com      / SuperSecret1!   (User)"
	@echo "  bob@example.com      / SuperSecret1!   (User)"
	@echo "  officer@example.com  / TestPass123!    (Officer)"
	@echo "  admin@example.com    / TestPass123!    (Administrator)"

seed: ## Re-run the idempotent demo seed against the running stack
	docker compose exec -T backend python seed.py

up: ## Start the stack (no rebuild)
	docker compose up -d

down: ## Stop the stack (data volume preserved)
	docker compose down

clean: ## Stop the stack and wipe ALL data (fresh-demo reset)
	docker compose down -v

logs: ## Follow logs from all services
	docker compose logs -f

ps: ## Show service status
	docker compose ps

venv: ## Create backend/.venv and install local dev dependencies (requirements/local.txt)
	cd backend && python3 -m venv .venv
	cd backend && .venv/bin/pip install --upgrade pip
	cd backend && .venv/bin/pip install -r requirements/local.txt
	@echo ""
	@echo "backend/.venv ready (requirements/local.txt installed)."
	@echo "Run 'make test-backend' to additionally install requirements/test.txt."

# make migrate: runs alembic upgrade head inside the backend container.
# This target is additive to the backend entrypoint's startup migration
# (docker-entrypoint.sh), not a replacement for it:
#   - Entrypoint  = safety net for non-`make` usage (plain `docker compose up`).
#   - make migrate = explicit control for developers/CI (run against an
#     already-running stack, re-run on demand without restarting the backend).
# Both coexist precisely because each covers a case the other doesn't.
#
check-env: ## Validate that .env exists and defines every variable from .env.example
	@if [ ! -f .env ]; then \
	  echo "ERROR: .env not found — copy it first:  cp .env.example .env"; \
	  exit 1; \
	fi; \
	FAIL=0; \
	for v in $$(sed -nE 's/^([A-Z_][A-Z0-9_]*)=.*/\1/p' .env.example | sort -u); do \
	  grep -qE "^$$v=" .env || { echo "  missing: $$v"; FAIL=1; }; \
	done; \
	if [ "$$FAIL" -ne 0 ]; then \
	  echo "ERROR: .env is missing variable(s) listed above (all defined in .env.example)."; \
	  echo "Fix: cp .env.example .env, then edit values."; \
	  exit 1; \
	fi; \
	echo "OK: .env defines every variable from .env.example."; \
	EXTRA=0; \
	for v in $$(sed -nE 's/^([A-Z_][A-Z0-9_]*)=.*/\1/p' .env | sort -u); do \
	  grep -qE "^$$v=" .env.example || { echo "  extra (not in .env.example): $$v"; EXTRA=1; }; \
	done; \
	if [ "$$EXTRA" -ne 0 ]; then \
	  echo "WARNING: .env has extra variable(s) — stale entries (e.g. a removed JWT_ALGORITHM) can confuse; consider removing them."; \
	fi

check-migrations: ## Fail loudly unless alembic migration history has exactly one head
	@cd backend && test -x .venv/bin/alembic || { echo "ERROR: backend/.venv is missing or lacks alembic — run 'make venv' first"; exit 1; }
	@HEADS="$$(cd backend && .venv/bin/alembic heads 2>/dev/null | grep -c '(head)' || true)"; \
	  if [ "$${HEADS}" -ne 1 ]; then \
	    echo "ERROR: expected exactly 1 alembic head, found $${HEADS}."; \
	    (cd backend && .venv/bin/alembic heads); \
	    echo "The migration history has branched — run 'alembic merge -m \"merge heads\" <head1> <head2>' (see Notes.md §6)."; \
	    exit 1; \
	  fi; \
	  echo "OK: exactly one alembic migration head."

migrate-backend: ## Run Alembic migrations against the running backend container (idempotent — safe to re-run)
	docker compose exec -T backend alembic upgrade head

update-requirements-backend: ## Regenerate pinned backend requirements/*.txt from requirements/*.in (re-pin, not bump-to-latest)
	@echo "=== Backend: regenerating requirements/base.txt, local.txt, test.txt ==="
	@cd backend && test -x .venv/bin/pip-compile || { echo "ERROR: pip-tools not found in backend/.venv — run 'make venv' first, or 'cd backend && python3 -m venv .venv && .venv/bin/pip install pip-tools'"; exit 1; }
	cd backend && .venv/bin/pip-compile requirements/base.in  -o requirements/base.txt
	cd backend && .venv/bin/pip-compile requirements/local.in -o requirements/local.txt
	cd backend && .venv/bin/pip-compile requirements/test.in  -o requirements/test.txt
	@echo "Backend requirements/*.txt regenerated."
	@echo ""
	@echo "Done. Rebuild the backend (docker compose build backend) and re-test before committing."

update-requirements-frontend: ## Regenerate frontend package-lock.json from package.json (re-pin, not bump-to-latest)
	@echo "=== Frontend: regenerating package-lock.json from package.json ==="
	cd frontend && npm install
	@echo "Frontend package-lock.json regenerated."
	@echo ""
	@echo "Done. Rebuild the frontend (docker compose build frontend) and re-test before committing."

update-requirements: update-requirements-backend update-requirements-frontend ## Regenerate both backend and frontend pinned dependency lockfiles

test-frontend: ## Run the existing frontend unit test suite locally (same suite as .github/workflows/frontend-unit-tests.yml)
	cd frontend && npm ci && npm run test:coverage

test-backend: ## Run the backend unit + coverage test suite locally (same suite as .github/workflows/backend-unit-tests.yml)
	@test -x backend/.venv/bin/python || { echo "ERROR: backend/.venv is missing — run 'make venv' first"; exit 1; }
	cd backend && .venv/bin/pip install --quiet -r requirements/test.txt
	@echo "Backend tests need a reachable Postgres test DB (trace_test) on localhost:5432."
	@echo "Credentials come from .env (copy .env.example): POSTGRES_USER / POSTGRES_PASSWORD."
	@echo "If one isn't running: docker compose up -d db  (then create the trace_test DB)"
	cd backend && \
	  TEST_DATABASE_URL=$${TEST_DATABASE_URL:-postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/trace_test} \
	  .venv/bin/python -m pytest --no-cov -v -m "not integration"
	cd backend && \
	  TEST_DATABASE_URL=$${TEST_DATABASE_URL:-postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/trace_test} \
	  .venv/bin/python -m pytest -v --cov=app --cov-report=term-missing --cov-report=xml:coverage.xml

test: test-backend test-frontend ## Run both backend and frontend test suites locally

lint-backend: ## Lint (and format-check) the backend with ruff
	@test -x backend/.venv/bin/python || { echo "ERROR: backend/.venv is missing — run 'make venv' first"; exit 1; }
	cd backend && .venv/bin/ruff check . --statistics
	cd backend && .venv/bin/ruff format --check .

lint-backend-fix: ## Auto-fix lint + formatting issues in the backend
	@test -x backend/.venv/bin/python || { echo "ERROR: backend/.venv is missing — run 'make venv' first"; exit 1; }
	cd backend && .venv/bin/ruff check . --fix
	cd backend && .venv/bin/ruff format .
