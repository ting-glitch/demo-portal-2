# Backend

FastAPI backend modules are organized by responsibility:

- `routers/`: HTTP route definitions.
- `reporting.py`: export-ready report aggregation for statement data.

The current app still keeps legacy endpoints in `app.py` to avoid a risky rewrite. New backend features should be added as routers or service modules under this folder, then included from `app.py`.

## Report API

- `GET /api/reports/periods`: available months and years.
- `GET /api/reports/statement`: professional report payload for all data.
- `GET /api/reports/statement?bill_month=2026-05`: one monthly report.
- `GET /api/reports/statement?year=2026`: one yearly report.

The statement report is shaped for future Excel/PDF export: metadata, column definitions, overview KPIs, summary sections, budget variance, and raw transaction rows.

