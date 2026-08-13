# TRACE — demo kit Makefile (Module 8).
#
# `make demo` is the ONE command that brings up the whole system from a clean
# checkout: it builds the four images, starts them (db first — the backend
# waits on its healthcheck), runs the Alembic migrations and the idempotent
# demo seed automatically inside the backend container, and waits until the
# API answers /health. See Tutorial.md for URLs and logins.

.PHONY: demo seed up down clean logs ps

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
