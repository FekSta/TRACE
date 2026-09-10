"""Dashboard module — Administrator reporting and administration.

The Dashboard module owns cross-entity reporting per `ABOUT.md` ("Reports,
analytics, administration, system configuration"). This pass implements the
Administrator "Generate Reports" flow (`assets/diagrams/data-flow.md`, §3):
a single `GET /dashboard/reports` endpoint parameterised by report type.

The module reads every other module's tables for display but never writes and
holds no business logic of its own — joins, filtering and sorting only.
"""
