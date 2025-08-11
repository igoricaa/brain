# Brain v2 Guide

This is the v2 Django project and API. Frontend moves here using a hybrid Django + Vite/React approach now, evolving to a standalone SPA later.

## Layout & Settings
- Project: `brain/brain/{settings.py,urls.py,api_urls.py}`; `INSTALLED_APPS` includes `companies`, `deals`, `dual_use`, `library`, `locations`, `socialgraph`, `users`, `common`.
- Templates: `brain/templates` (extends `base.html`, `main.html`).
- Static: `STATICFILES_DIRS` includes `assets/dist` (Vite build output).
- Auth: Allauth + OAuth2; DRF auth via session or token scopes.

## API Surface
- Router: `brain/brain/api_urls.py` composes app routers under `/api/`.
- Docs: `/api/docs/`, `/api/swagger-ui/`, `/api/schema/` (drf-spectacular).

## Frontend Strategy
- Hybrid: keep Django routes; mount React in templates; fetch data from `/api/*`.
- Vite: `brain/assets` with `build.outDir='assets/dist'`, `base='/static/'`, `manifest=true`.
- Versions: React 19, Vite 7.1.1.
- Template tag: `{% load vite %}{% vite_entry 'src/main.tsx' %}` (base) and page-specific entries per view.
- Entries: `main`, `deals_dashboard`, `deal_detail`, `company_detail`, `du_dashboard`.

## Useful Paths
- Companies templates/views: `brain/apps/companies/views/*`, `brain/apps/companies/urls.py`, templates under `brain/templates/companies/`.
- Deals/Dual-use/Library: API implemented, server views/urls to add as needed (see app guides).
- Template tags: `brain/templatetags/vite.py` (asset loader), `apps/common/templatetags/brain.py` (filters: `intword_usd`, `url_display`).

## Tips
- Use UUID fields for lookups (`slug_field='uuid'` in views, DRF lookups).
- Prefer DRF list/detail for data; minimize server-side context.
- Lint/format: `npm run lint`, `npm run format` (ESLint + Prettier configured in `brain/package.json`).
