## Summary
<!-- What changed and why? Include the root cause for bug fixes. -->
## Type
- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Backend (FastAPI / Alembic migrations)
- [ ] Frontend (React / Vitest)
- [ ] Documentation
- [ ] Security
## Validation
- [ ] `make check-migrations` reports exactly one head (if migrations were touched)
- [ ] `make check-env` passes (if `.env.example` was touched)
- [ ] `make lint-backend` and `cd frontend && npm run lint` pass
- [ ] `make test-backend`
- [ ] `make test-frontend`
- [ ] Focused backend, frontend, or documentation checks as applicable
- [ ] `git diff --check`
Validated commit, exact commands, and passing evidence for unchanged code:
<!-- Local checks are the merge gate; hosted CI is a safety net. -->
Tested environments:
<!-- List exact coverage and clearly identify anything not tested. -->
## User Impact and Risk
<!-- Describe behavior changes, migration needs, compatibility risk, and rollback. -->
## Related Issue
Closes #
## Screenshots
<!-- Required only for visible UI changes. -->
