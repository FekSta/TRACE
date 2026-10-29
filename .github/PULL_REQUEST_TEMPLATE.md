
## Summary
 
<!-- Describe what changed and why. For bug fixes, explain the root cause. -->
 
## Type of change

- [ ] Bug fix
- [ ] Feature or enhancement
- [ ] Refactor or technical debt
- [ ] Frontend (React)
- [ ] Backend or API (FastAPI)
- [ ] Database or migration (PostgreSQL)
- [ ] Background processing (Celery / Redis)
- [ ] Docker, CI/CD, or deployment
- [ ] Documentation
- [ ] Security or privacy

## Related issue

Closes #

## Implementation details

<!--
Describe the relevant components and data flow.
Mention affected frontend pages, API routes, services, models,
database tables, Celery tasks, or configuration where applicable.
-->

## Validation

- [ ] Existing relevant tests pass.
- [ ] New or updated tests cover the change where appropriate.
- [ ] Frontend behavior and API integration were checked, if applicable.
- [ ] API validation, error responses, and authorization were checked, if applicable.
- [ ] Database changes and migrations were checked, if applicable.
- [ ] Celery tasks, Redis interactions, retries, and failure handling were checked, if applicable.
- [ ] Docker Compose startup and affected service health were checked, if applicable.
- [ ] `git diff --check` passes.
- [ ] No secrets, credentials, tokens, or sensitive user data are included.
- [ ] Documentation and environment examples were updated, if needed.

**Tests and commands run:**

<!-- Include exact commands and their results. -->

**Not tested / limitations:**

<!-- Explain any untested behavior and why. Do not claim checks that were not run. -->

## API and data compatibility

- [ ] No API or data contract changes.
- [ ] API changes are documented and affected consumers were considered.
- [ ] Database changes are backward-compatible or include a migration plan.
- [ ] Environment variable or configuration changes are documented.
- [ ] Background jobs remain compatible with the affected application code.

<!-- Select the applicable items; explain breaking changes below. -->

**Compatibility notes:**

<!-- Document migrations, deployment order, rollback, or breaking changes. -->

## Security and privacy

- [ ] Authentication and authorization are preserved.
- [ ] Input validation and file-upload handling were considered, if applicable.
- [ ] Logs and error responses do not expose secrets or sensitive information.
- [ ] No new security concerns identified.

**Security considerations:**

<!-- Describe relevant risks, or write "Not applicable" with a reason. -->

## User impact and risk

**User-visible impact:**

<!-- What changes for students, item owners, officers, or administrators? -->

**Risk and rollback plan:**

<!-- What could break, and how can the change be reverted safely? -->

## Screenshots or API examples

<!-- Include screenshots for UI changes or sanitized request/response examples for API changes. Remove personal data and credentials. -->

## Reviewer notes

<!-- Highlight non-obvious decisions, areas needing careful review, or follow-up work. -->
