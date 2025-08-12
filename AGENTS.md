# Repository Guidelines

This monorepo hosts: (1) `aindex/` a standalone Python backend (do not modify), (2) `aindex-web/` the legacy Django UI with Webpack assets, and (3) `brain/` the v2 Django app and API where we build the new frontend.

## Project Structure & Module Organization
- `brain/`: Django project with apps under `brain/apps/*`, DRF APIs under `apps/**/api`, and templates in `brain/templates`.
- `aindex-web/`: Reference UI — templates in `templates/`, assets in `assets/` (legacy Webpack bundles to `assets/dist`).
- `aindex/`: Python package and docs; treat as external dependency.
- `docker-compose-dev.yaml`: PostGIS and RabbitMQ for local dev.

## Build, Test, and Development Commands
- Services: `docker compose -f docker-compose-dev.yaml up -d`
- Brain backend: `cd brain && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt && python manage.py migrate && python manage.py runserver`
- API docs: visit `/api/docs/` (Redoc) or `/api/swagger-ui/` when running.
- Frontend (hybrid, React 19 + Vite 7):
  - Dev: `cd brain && npm install && npm run dev`
  - Build: `cd brain && npm run build` (outputs to `assets/dist` + `manifest.json`)
  - Entries live under `brain/assets/src`; Vite config at `brain/assets/vite.config.ts`.

## Coding Style & Naming Conventions
- Python: `black` (119 cols in brain), `isort` (black profile), `flake8` (`setup.cfg`/`pyproject.toml`).
- Names: modules/functions snake_case; classes PascalCase; Django apps under `brain/apps/*`.
- JS/CSS: follow aindex-web patterns; kebab-case for asset files; camelCase in JS. React components live in `brain/assets/src`.

## Testing Guidelines
- Django: app-level tests under `apps/<app>/tests/`; run `python manage.py test`.
- Py package (aindex): `pytest` and `tox` (reference only).
- Aim for API-first tests on new views; mock external I/O.

## Commit & Pull Request Guidelines
- Commits: imperative + scope, e.g., `brain/deals: add dashboard view`.
- PRs: include description, linked issues, screenshots for UI changes, and note migrations/API updates.

## V2 Frontend Adaptation Roadmap (brain)
- Companies: keep existing server views (detail, grant/patent CRUD). Ensure `companies/company_detail.html` loads charts/widgets and maps to APIs: `/api/companies/companies`, `.../grants`, `.../patent-applications` (lookup by `uuid`). Company detail grants/patents panels are paginated with “View all” links; CRUD flows preserve `next` redirect back to the same paginated view; patent bulk delete uses a single server-side POST form.
- Deals: URLs and shell templates added under `brain/apps/deals` and `brain/templates/deals`. Next: data JSON aggregation and React dashboard.
- Deals: URLs and shell templates added under `brain/apps/deals` and `brain/templates/deals`. Dashboard JSON and React charts completed. Deal Detail and Assessment React islands live. Refresh+status flow implemented. Fresh and Past Deals React components implemented with sidebar layout (see `brain/apps/deals/AGENTS.md`).
- Dual-use: port `dual_use/*` templates and add URLs/views in `brain/apps/dual_use`; back with `/api/deals/du-signals` and related.
- People: map aindex-web `talents/*` to brain models (`socialgraph.Profile`, `companies.Founder/Advisor`). Replace talent forms with API-driven UIs.
- Assets: add `brain/assets` + Vite (entries for `main`, `deals_dashboard`, `deal_detail`, `company_detail`, `du_dashboard`) building to `brain/assets/dist` (already in `STATICFILES_DIRS`).

## React & Vite (Hybrid → Standalone)
- Versions: React 19, Vite 7.1.1.
- Dev: `npm run dev` (Vite server at 5173). Prod: `npm run build` (hashed assets + manifest).
- Django integration: Using `django-vite` package - `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}` in base, and page-specific `{% vite_asset 'src/pages/<entry>.tsx' %}` where needed (e.g., company_detail, deals dashboard).
- Migration: start with islands in Django templates, then graduate to a standalone React app consuming `/api/*`.

## Security & Configuration
- Create envs from examples (`brain/.env.example`, `aindex-web/.env.dev.example`) and never commit secrets. Use Docker DB/RabbitMQ per URIs in `docker-compose-dev.yaml`.

## Further Reading
- Brain overview: `brain/AGENTS.md`
- Companies: `brain/apps/companies/AGENTS.md`
- Common app (template tags): `brain/apps/common/AGENTS.md`
- Deals: `brain/apps/deals/AGENTS.md`
- Dual-use: `brain/apps/dual_use/AGENTS.md`
- Library: `brain/apps/library/AGENTS.md`
- Socialgraph: `brain/apps/socialgraph/AGENTS.md`
- Frontend assets: `brain/assets/AGENTS.md`
- Legacy UI reference: `aindex-web/AGENTS.md`
- Migration checklists: `docs/FRONTEND_MIGRATION_CHECKLIST.md`
