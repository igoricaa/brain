# Frontend Migration Checklists

Central checklist for adapting legacy UI into brain and progressively migrating to React with Vite.

## Vite + React (Hybrid)
- [done] Create `brain/assets/` via Vite React template (TS), set `build.outDir='assets/dist'`, `base='/static/'`, `build.manifest=true`.
- [done] Dev: `npm run dev` (Vite 7); Django: `python manage.py runserver`.
- [done] Production: `npm run build`; serve `assets/dist` via Django staticfiles.
- [done] Django helper (template tag) to resolve entries from `manifest.json` when not in DEBUG.

## Companies
- [done] Port templates from `aindex-web/templates/companies/*` to `brain/templates/companies/*` where missing.
- [done] Verify URLs in `brain/apps/companies/urls.py` match expectations; confirm `slug_field='uuid'`.
- [done] React mount + page-specific entry: `#company-detail-root` and `{% vite_entry 'src/pages/company_detail.tsx' %}`.
- [done] Initial API call: `/api/companies/companies/{uuid}/` for About card.
- [next] Add founders/advisors lists; grants/patents via APIs.

## Deals
- Add `brain/apps/deals/urls.py` with dashboard/list/detail/assessment/delete/refresh/processing-status routes.
- Implement thin server views and `DealsDashboardDataView` JSON aggregation.
- Port templates to `brain/templates/deals/*` and wire Vite entries for `deals_dashboard` and `deal_detail`.
- API calls: `/api/deals/deals/` (list/detail/update), `/api/deals/du-signals/`, files/papers/decks endpoints.
- Polling: implement `processing-status` returning `{ready: bool}`; legacy JS polls and reloads when ready.

## Dual-use
- Add `brain/apps/dual_use/urls.py` and minimal views for dashboard + report CRUD.
- Port templates to `brain/templates/dual_use/*`.
- React `du_dashboard` entry for charts; data from `/api/deals/du-signals/` and any DU report JSON views.

## Socialgraph / Talents Migration
- Replace legacy talents pages with React components backed by `/api/companies/founders` and `/api/companies/advisors`.
- Update links/navigation accordingly.

## Styling & Assets
- Bring over SCSS tokens from legacy; scope global styles to avoid regressions.
- Migrate icon/fonts/images referenced by templates to Vite pipeline.

## QA & Rollout
- Page parity validation (side-by-side with legacy where possible).
- Track deltas (UX tweaks, removed features) in PRs.
- Capture screenshots and link to API changes in PR template.
