# TRACE — demo kit Makefile (Module 8).
#
# `make demo` is the ONE command that brings up the whole system from a clean
# checkout: it builds the four images, starts them (db first — the backend
# waits on its healthcheck), runs the Alembic migrations and the idempotent
# demo seed automatically inside the backend container, and waits until the
# API answers /health. See Tutorial.md for URLs and logins.

.PHONY: demo seed up down clean logs ps check-migrations migrate-backend update-requirements test-frontend

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

# make migrate: runs alembic upgrade head inside the backend container.
# This target is additive to the backend entrypoint's startup migration
# (docker-entrypoint.sh), not a replacement for it:
#   - Entrypoint  = safety net for non-`make` usage (plain `docker compose up`).
#   - make migrate = explicit control for developers/CI (run against an
#     already-running stack, re-run on demand without restarting the backend).
# Both coexist precisely because each covers a case the other doesn't.
#
check-migrations: ## Fail loudly unless alembic migration history has exactly one head
	@cd backend && test -x .venv/bin/alembic || { echo "ERROR: backend/.venv is missing — run 'make venv' or build the backend image first"; exit 1; }
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

update-requirements-backend: ## Regenerate pinned backend requirements.txt from requirements.in (re-pin, not bump-to-latest)
	@echo "=== Backend: regenerating requirements.txt from requirements.in ==="
	cd backend && test -x .venv/bin/pip-compile || { echo "ERROR: pip-tools not found in backend/.venv — run 'cd backend && python3 -m venv .venv && .venv/bin/pip install pip-tools' first"; exit 1; }
	cd backend && .venv/bin/pip-compile requirements.in -o requirements.txt
	@echo "Backend requirements.txt regenerated."
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
