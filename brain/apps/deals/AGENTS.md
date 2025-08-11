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

## Server Views & Templates (to add)
- URLs (new): `brain/apps/deals/urls.py` mirroring legacy aindex-web:
  - `'' → DealsDashboardView` (name `deals-dashboard`)
  - `'fresh'`, `'reviewed'`, `'missed'` lists
  - `'<uuid:uuid>/' → DealDetailView`, `update`, `assessment`, `delete`, `refresh`, `processing-status`
  - `'dash/data/' → DealsDashboardDataView` (JSON)
- Templates to port to `brain/templates/deals/`:
  - `base.html`, `deals_dashboard.html`, `fresh_deals.html`, `reviewed_deals.html`, `missed_deal_list.html`,
    `deal_detail.html`, `deal_assessment.html`, `deal_confirm_delete.html`, `deck_create.html`.

## Adaptation Checklist (Phase 1)
- Implement URLs and thin class-based views that render shells; move data to DRF and JSON views.
- Port templates and update static includes to Vite entries (`deals_dashboard`, `deal_detail`).
- Add `DealsDashboardDataView` (JSON) aggregations (date trend, stages, industries, DU signals) equivalent to legacy.
- Implement polling endpoint for `processing-status` returning `{ready: bool}`.

## React Migration (Phase 2)
- Replace Vue dashboard with React charts (react-chartjs-2) calling `dash/data/`.
- Deal Detail/Assessment: React form with optimistic UI and API updates; Affinity send flow via existing endpoints.
- Mount points: `#_deals-dashboard`, `#deal-detail-root`, `#deal-assessment-root`.
