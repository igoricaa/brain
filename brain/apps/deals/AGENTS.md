# Deals App Guide

Purpose: deals domain (Deal, DraftDeal, files, decks, papers, dual-use signals). API is implemented; server views/URLs to be added for UI.

## Models (high level)
- `Deal`, `DraftDeal`: core records with `uuid` lookup; relations to `Company`, `Industry`, `DualUseSignal`.
- `DealFile`/`Paper`/`Deck`: attached documents.
- `DualUseSignal`, `DualUseCategory`: taxonomy.

## APIs (DRF)
- Base: `/api/deals/`
- Endpoints: `deals`, `drafts`, `files`, `decks`, `papers`, `du-signals`.
- List/detail via `uuid`; filters available (see `api/filters.py`).

## Server Views & Templates
- URLs: `brain/apps/deals/urls.py` added with names:
  - `dashboard`, `fresh_deals`, `reviewed_deals`, `missed_deals`
  - `deal_detail`, `deal_update`, `deal_assessment`, `deal_confirm_delete`, `deck_create`
  - `processing_status` (polling stub), `dashboard_data` (JSON data)
- Templates (ported shells) in `brain/templates/deals/`:
  - `base.html`, `deals_dashboard.html`, `fresh_deals.html`, `reviewed_deals.html`, `missed_deal_list.html`,
    `deal_detail.html`, `deal_assessment.html`, `deal_confirm_delete.html`, `deck_create.html`.
- Project URLs include `path('deals/', include(('deals.urls','deals'), namespace='deals')))`.

## Adaptation Checklist (Phase 1)
- [done] Add URLs and thin function views that render shells.
- [done] Port templates and prepare React mount points.
- [done T-0203] Implemented `dashboard_data` JSON aggregations (trend, stages, industries, DU signals, counts).
- [todo T-0304] Flesh out `processing_status` and `deal_refresh` behavior.

## React Migration (Phase 2)
- Replace Vue dashboard with React charts (react-chartjs-2) calling `deals/dash/data/`.
- Deal Detail/Assessment: React form with optimistic UI and API updates; Affinity send flow via existing endpoints.
- Mount points: `#deals-dashboard-root`, `#deal-detail-root`, `#deal-assessment-root`.

### Deals Dashboard (T-0204)
- Page module: `assets/src/pages/deals_dashboard.tsx`; initialized via single-entry router (`body#_deals-dashboard`).
- Charts: `react-chartjs-2` + `chart.js`, shared palette in `assets/src/lib/charts.ts` (mirrors legacy `du_charts.js`).
- Data: Fetches `/deals/dash/data/` with `date_from` and `date_to` query params; URL params persist via `history.replaceState`.
- Rendered charts:
  - Line: daily deals trend.
  - Pie: funding stage; dual-use signals (with inline legends).
  - Bar: industries (top 10).
- Dependencies added: `chart.js@^4`, `react-chartjs-2@^5` (see `brain/package.json`).

### Dashboard JSON (T-0203)
- View: `deals.views.deals_dashboard_data`.
- Fields: `date_count_trend`, `funding_stage_count`, `industry_count`, `du_signal_count`, plus time-window counts and `quality_percentile_count`, `sent_to_affinity_count`.
- Bugfix: Use `related_query_name` for reverse filters when counting company relations:
  - Grants: `company__grant__isnull=False` (not `grants__isnull`).
  - Clinical studies: `company__clinical_study__isnull=False` (not `clinical_studies__isnull`).
  - Rationale: Django queryset filters require `related_query_name` on reverse lookups; `related_name` is for attribute access.

### Notes
- Time axis uses category labels for simplicity; if time-scale ticks are preferred, add `chartjs-adapter-dayjs-4` and switch the x-scale to `type: 'time'`.
