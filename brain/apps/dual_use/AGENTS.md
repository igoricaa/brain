# Dual-use App Guide

Purpose: Dual-use dashboard and reports UI. In v2 (brain), DU taxonomy lives under the Deals app (`DualUseSignal`/`DualUseCategory`) and the dashboard is rendered by a React island with an API-driven summary endpoint.

## Models
- Reference only: `aindex-web/apps/dual_use/models.py` (legacy). In brain, use `deals.models.DualUseSignal` and `deals.models.DualUseCategory` for taxonomy. Companies and founders are under `companies.models`.

## APIs
- Taxonomy: `/api/deals/du-signals/` (ReadOnlyModelViewSet) — used to populate category filter options.
- Summary (v2): `/api/dual-use/summary/` (ViewSet action)
  - Filters: `category_name` (iexact on DU category name), `hq_country` (ISO alpha‑2)
  - Aggregates counts over Companies linked to Deals that have DU signals:
    - `hq_country_company_count`, `hq_state_company_count`, `hq_city_company_count`
    - `tech_type_company_count`, `industries_company_count`
    - `year_founded_company_count`, `founders_count_company_count`

## Server Views & Templates (shells)
- URLConf: `brain/apps/dual_use/urls.py` (namespace: `dual-use`) routes:
  - Dashboard shell: `''` → template `dual_use/dashboard.html` (contains `#du-dashboard-root`)
  - Report shells: list, unreviewed list, detail, create, update, delete
- Templates in `brain/templates/dual_use/`: `base.html`, `dashboard.html`, `report_list.html`, `unreviewed_report_list.html`, `report_detail.html`, `report_create.html`, `report_update.html`, `report_delete.html`, and includes (`includes/report_filters.html`, `includes/mapped_tags.html`).

Note: A former server JSON placeholder (`views.summary_data`) has been removed; the React app uses the DRF endpoint.

## React Island (Vite + React)
- Entry mapping: `_du-dashboard` → `src/pages/du_dashboard.tsx` via `src/main.tsx` single-entry router.
- Data flow:
  - Fetch category options from `/api/deals/du-signals/?page_size=500` and de‑duplicate by category name.
  - Fetch summary from `/api/dual-use/summary/` with query params persisted in the URL (`category_name`, `hq_country`).
- Charts: chart.js via `react-chartjs-2`, palette/options shared in `src/lib/charts.ts`.

## Migration Notes
- v1 parity: Legacy used `/dual-use/summary/data/` to serve aggregated JSON consumed by a dashboard script. v2 mirrors this with a DRF endpoint to keep the frontend lean and efficient.
- Styling: Shell templates are Tailwind‑friendly and minimal; React handles the interactive UI.

## Verification
- Run backend + Vite dev; visit `/dual-use/` and interact with filters — URL updates and charts refresh. API schema lists `/api/dual-use/summary/`.
