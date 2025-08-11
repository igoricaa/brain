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
- Frontend (hybrid): Vite + React in `brain/assets` with `build.outDir` to `assets/dist` (served via Django staticfiles). Use `vite dev` during development and `vite build` for production.

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
- Companies: keep existing server views (detail, grant/patent CRUD). Ensure `companies/company_detail.html` loads charts/widgets and maps to APIs: `/api/companies/companies`, `.../grants`, `.../patent-applications` (lookup by `uuid`).
- Deals: port pages (`deals/base.html`, `deals_dashboard.html`, `fresh_deals.html`, `reviewed_deals.html`, `missed_deal_list.html`, `deal_detail.html`, `deal_assessment.html`, `deck_create.html`) and add URLs/views in `brain/apps/deals`. Use DRF endpoints under `/api/deals/*`.
- Dual-use: port `dual_use/*` templates and add URLs/views in `brain/apps/dual_use`; back with `/api/deals/du-signals` and related.
- People: map aindex-web `talents/*` to brain models (`socialgraph.Profile`, `companies.Founder/Advisor`). Replace talent forms with API-driven UIs.
- Assets: add `brain/assets` + Vite (entries for `main`, `deals_dashboard`, `deal_detail`, `company_detail`, `du_dashboard`) building to `brain/assets/dist` (already in `STATICFILES_DIRS`).

## React & Vite (Hybrid → Standalone)
- Dev: `cd brain && npm create vite@latest ./assets -- --template react-ts` then set `build.outDir` to `assets/dist`, `base` to `/static/`, and enable `manifest: true`.
- Include assets: in DEBUG use Vite dev server; in production load hashed files via `manifest.json` under `assets/dist`.
- Migration: start with islands in Django templates, then graduate to a standalone React app consuming `/api/*`.

## Security & Configuration
- Create envs from examples (`brain/.env.example`, `aindex-web/.env.dev.example`) and never commit secrets. Use Docker DB/RabbitMQ per URIs in `docker-compose-dev.yaml`.
