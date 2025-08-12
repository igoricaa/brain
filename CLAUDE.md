# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This is a monorepo with distributed documentation. Check both CLAUDE.md and AGENTS.md files for module-specific guidance:

### Primary Documentation
- Main repository guidelines: `AGENTS.md`
- This file: `CLAUDE.md` (development commands and architecture)
- Migration roadmap: `docs/TASKS.md` and `docs/FRONTEND_MIGRATION_CHECKLIST.md`
- **UI Redesign**: `docs/sidebar_redesign.md` (T-0401 Sidebar Navigation Implementation)

### Module-Specific Documentation (AGENTS.md)
- Brain overview: `brain/AGENTS.md`
- Companies: `brain/apps/companies/AGENTS.md`
- Deals: `brain/apps/deals/AGENTS.md`
- Dual-use: `brain/apps/dual_use/AGENTS.md`
- Library: `brain/apps/library/AGENTS.md`
- Socialgraph: `brain/apps/socialgraph/AGENTS.md`
- Common utilities: `brain/apps/common/AGENTS.md`
- Frontend assets: `brain/assets/AGENTS.md`
- Legacy UI reference: `aindex-web/AGENTS.md`

## Development Commands

### Environment Setup
- Start services: `docker compose -f docker-compose-dev.yaml up -d`
  - PostgreSQL with PostGIS (dev: localhost:6432, test: localhost:7432)
  - RabbitMQ (AMQP: localhost:6672, Management UI: localhost:26672)
  - Default credentials: username/password = aindex/aindex
- **aindex** (Python library - treat as external dependency, do not modify):
  - `cd aindex && python -m venv .venv && . .venv/bin/activate && pip install -r requirements_dev.txt`
- **brain** (v2 Django API):
  - `cd brain && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt`
- **aindex-web** (Legacy Django + Webpack UI):
  - Backend: `cd aindex-web && python -m venv .venv && . .venv/bin/activate && pip install -r requirements_dev.txt`
  - Frontend: `cd aindex-web && npm install`

### Running Applications
- **brain**: 
  - Backend: `cd brain && python manage.py migrate && python manage.py runserver`
  - Frontend dev: `cd brain && npm run dev` (Vite server at :5173)
  - Frontend build: `cd brain && npm run build` (outputs to `assets/dist` + `manifest.json`)
  - API docs: http://localhost:8000/api/docs/ (ReDoc) or /api/swagger-ui/
- **aindex-web** (legacy): 
  - Backend: `cd aindex-web && python manage.py migrate && python manage.py runserver`
  - Frontend dev: `cd aindex-web && npm run start`
  - Frontend build: `cd aindex-web && npm run build`
  - Frontend watch: `cd aindex-web && npm run watch`

### Testing & Code Quality
- **aindex**: 
  - Quick test: `cd aindex && pytest`
  - Full suite: `cd aindex && make test`
  - Linting: `cd aindex && make lint`
  - Coverage: `cd aindex && make coverage`
  - All environments: `cd aindex && tox`
- **Django apps**: 
  - All tests: `python manage.py test`
  - Specific app: `python manage.py test apps.companies`
  - With coverage: `coverage run --source='.' manage.py test && coverage report`
- **Code formatting**:
  - Python: `black . --line-length 119` (brain) or `black . --line-length 110` (aindex)
  - Import sorting: `isort .` (configured in setup.cfg)
  - Linting: `flake8` (configured in setup.cfg/pyproject.toml)

## Architecture Overview

This is a monorepo containing three related components:

1. **aindex/** - Core Python library for document processing, AI integration, and data extraction
   - **DO NOT MODIFY** - treat as external dependency
   - Contains CLI tools, OpenAI/VertexAI integrations, PDF parsers
   - Main modules: `openai/`, `parsers/`, `crunchbase/`, `vertexai/`
   - Comprehensive test suite with pytest and tox

2. **brain/** - Modern Django application (Django 5.2+) - **PRIMARY DEVELOPMENT TARGET**
   - API-first architecture with Django REST Framework
   - Apps under `brain/apps/`: `companies`, `deals`, `library`, `socialgraph`, `locations`, `users`, `dual_use`
   - API endpoints under `apps/*/api/` with serializers, views, filters
   - Uses PostgreSQL with PostGIS and pgvector extensions
   - OpenAPI documentation via drf-spectacular
   - **UI Layout**: Fixed sidebar navigation with modern design (`bg-slate-50`, brAINbrAIN branding)
   - **Frontend Migration**: Transitioning to React + Vite (see docs/TASKS.md)

3. **aindex-web/** - Legacy Django application (Django 5.1) with web UI
   - **REFERENCE ONLY** - being migrated to brain
   - Full-featured web interface with Bootstrap 5, Chart.js, Vue.js components
   - Apps: `companies`, `deals`, `talents`, `dual_use`, `librarain`, `locations`, `users`
   - Webpack build system (entries: main, company_detail, deal_detail, deals_dashboard, du_dashboard)
   - Template-based rendering - templates being ported to brain

### Key Technical Details
- Both Django apps use Celery for background tasks (RabbitMQ as broker)
- PostgreSQL 16 with PostGIS 3.4 and pgvector extensions
- Authentication: OAuth2, Google Social Auth, django-allauth
- File storage: Local + Google Cloud Storage support
- API documentation: drf-spectacular at `/api/docs/` and `/api/swagger-ui/`
- Background processing: Celery with django-celery-beat for scheduling
- Search: PostgreSQL full-text search with GIN indexes

### Frontend Migration Strategy
- **Current State**: Hybrid approach with Django templates + React islands
- **Target State**: Standalone React SPA consuming DRF APIs
- **Tech Stack**: React 19 + TypeScript + Vite 7.1.1
- **UI Architecture**: Fixed sidebar layout (`w-64` left, `ml-64` content offset)
- **Migration Path**: See `docs/TASKS.md` for detailed epic breakdown
- **Django Integration**: Using `django-vite` package for asset management
  - Base template: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}`
  - Layout template: `main.html` includes `sidebar_nav.html` for consistent navigation
  - HMR client injection in development mode via `{% vite_hmr_client %}`
- **Key URLs**:
  - Companies: `/companies/<uuid>/` → React components for panels
  - Deals: `/deals/`, `/deals/<uuid>/` → Dashboard and detail views with sidebar
  - APIs: All under `/api/` namespace with consistent patterns

## Code Style & Standards

### Python
- Line length: 119 characters (brain), 110 characters (aindex)
- Formatting tools: `black`, `flake8`, `isort` (all configured)
- Django apps organized under `apps/` subdirectory
- Naming: snake_case for modules/functions, PascalCase for classes
- Imports: Follow isort sections (FUTURE, STDLIB, DJANGO, THIRDPARTY, AINDEX, FIRSTPARTY, LOCALFOLDER)

### JavaScript/Frontend
- Legacy (aindex-web): Webpack, Bootstrap 5, Chart.js, Vue.js
- Modern (brain): React 19 + TypeScript + Vite 7.1.1
- **Design System**: Tailwind CSS 4.1.1, sidebar navigation, colorful metric cards
- **Layout Patterns**: Fixed sidebar (`bg-slate-900`), content area (`bg-white`), app background (`bg-slate-50`)
- Naming: camelCase for variables, kebab-case for files, PascalCase for components
- Assets: `assets/` → `assets/dist/` (Webpack) or `brain/assets/` → `brain/assets/dist/` (Vite)
- Frontend structure: Entries in `brain/assets/src/`, config at `brain/assets/vite.config.ts`
- Linting: ESLint + Prettier configured (`npm run lint`, `npm run format`)

### Database
- Always use Django migrations (never manual SQL)
- UUID primary keys for main entities
- Proper indexes on foreign keys and search fields
- Vector embeddings: pgvector with ivfflat indexes
- PostGIS for geographic data

### API Design Patterns
- RESTful endpoints under `/api/` namespace
- Consistent URL patterns: `/api/<app>/<resource>/`
- Use DRF ViewSets with proper serializers
- Filter classes in `api/filters.py`
- Pagination: PageNumberPagination (default 20)
- Authentication: OAuth2 tokens or session

## Working with this Codebase

- **Primary work should be in brain**, not aindex-web
- **Always check AGENTS.md files** for module-specific guidance and patterns
- **UI/Template Work**: All new pages should extend `main.html` for consistent sidebar layout
- Check for existing patterns in the target app before implementing
- Use appropriate virtual environment for each component
- Run tests and linting before committing:
  - Python: `black`, `isort`, `flake8`, `python manage.py test`
  - Frontend: `npm run lint`, `npm run format`
- For frontend work, check if React component exists before modifying templates
- **Design Consistency**: Follow established patterns in `sidebar_nav.html` and metric card components
- Consult `docs/TASKS.md` for migration status and planned work

## Security & Configuration
- Create envs from examples (`brain/.env.example`, `aindex-web/.env.dev.example`)
- Never commit secrets or credentials
- Use Docker services for local development (PostgreSQL, RabbitMQ)