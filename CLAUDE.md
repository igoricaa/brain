# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
- Start services: `docker compose -f docker-compose-dev.yaml up -d`
- **aindex** (Python library):
  - `cd aindex && python -m venv .venv && . .venv/bin/activate && pip install -r requirements_dev.txt`
- **brain** (Django app):
  - `cd brain && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt`
- **aindex-web** (Django + Webpack):
  - Backend: `cd aindex-web && python -m venv .venv && . .venv/bin/activate && pip install -r requirements_dev.txt`
  - Frontend: `cd aindex-web && npm install`

### Running Applications
- **brain**: `cd brain && python manage.py migrate && python manage.py runserver`
- **aindex-web**: 
  - Backend: `cd aindex-web && python manage.py migrate && python manage.py runserver`
  - Frontend dev server: `cd aindex-web && npm run start`
  - Frontend build: `cd aindex-web && npm run build`

### Testing & Code Quality
- **aindex**: `cd aindex && pytest` (or `make test`, `make lint`, `tox` for all environments)
- **Django apps**: `python manage.py test` from respective directories
- **Frontend**: `cd aindex-web && npm test` (not configured yet)

## Architecture Overview

This is a monorepo containing three related components:

1. **aindex/** - Core Python library for document processing, AI integration, and data extraction
   - Contains CLI tools, OpenAI/VertexAI integrations, PDF parsers
   - Has comprehensive test suite and documentation
   - Main modules: `openai/`, `parsers/`, `crunchbase/`, `vertexai/`

2. **brain/** - Modern Django application (Django 5.2+)
   - API-first architecture with DRF and OpenAPI docs
   - Apps: `companies`, `deals`, `library`, `socialgraph`, `locations`, `users`, `dual_use`
   - Uses PostgreSQL with vector extensions for embeddings
   - Clean separation between models, API serializers, and views

3. **aindex-web/** - Legacy Django application (Django 5.1) with web UI
   - Full-featured web interface with Bootstrap 5, charts, and data visualization
   - Apps: `companies`, `deals`, `talents`, `dual_use`, `librarain`, `locations`, `users`
   - Webpack build system for frontend assets (SCSS, JS)
   - Template-based rendering with Django templates

### Key Technical Details
- Both Django apps use Celery for background tasks with Redis/RabbitMQ
- PostgreSQL with PostGIS and pgvector extensions
- OAuth2 authentication and Google Social Auth
- File storage supports Google Cloud Storage
- API documentation via drf-spectacular (OpenAPI/Swagger)

## Code Style & Standards

### Python
- Line length: 119 characters (configured in setup.cfg/pyproject.toml)
- Formatting: `black`, `flake8`, `isort`
- Django apps organized under `apps/` subdirectory
- Use snake_case for modules/functions, PascalCase for classes

### JavaScript/Frontend
- Built with Webpack, uses Bootstrap 5, Chart.js, Vue.js components
- Prefer camelCase for variables, kebab-case for files
- Assets in `assets/` directory with SCSS compilation

### Database
- Uses Django migrations for schema changes
- Model relationships carefully designed with proper foreign keys
- Vector embeddings stored using pgvector extension

When working with this codebase:
- Check which Django app you're working with (brain vs aindex-web have different structures)
- Use the appropriate virtual environment for each component
- Run tests and linting before committing changes
- Follow existing patterns in model organization and API design