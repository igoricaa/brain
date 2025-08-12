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
  - `processing_status` (polling stub), `dashboard_data` (JSON stub)
- Templates (ported shells) in `brain/templates/deals/`:
  - `base.html`, `deals_dashboard.html`, `fresh_deals.html`, `reviewed_deals.html`, `missed_deal_list.html`,
    `deal_detail.html`, `deal_assessment.html`, `deal_confirm_delete.html`, `deck_create.html`.
- Project URLs include `path('deals/', include(('deals.urls','deals'), namespace='deals')))`.

## Adaptation Checklist (Phase 1)
- [done] Add URLs and thin function views that render shells.
- [done] Port templates and prepare React mount points.
- [todo T-0203] Implement `dashboard_data` JSON aggregations (trend, stages, industries, DU signals).
- [todo T-0304] Flesh out `processing_status` and `deal_refresh` behavior.

## React Migration (Phase 2)
- Replace Vue dashboard with React charts (react-chartjs-2) calling `deals/dashboard_data`.
- Deal Detail/Assessment: React form with optimistic UI and API updates; Affinity send flow via existing endpoints.
- Mount points: `#deals-dashboard-root`, `#deal-detail-root`, `#deal-assessment-root`.
