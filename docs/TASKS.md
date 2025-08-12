# Frontend v2 Task Tickets

This document tracks epics and granular tickets for adapting the legacy UI into `brain` with a hybrid Vite + React setup, then preparing for a standalone SPA. Each ticket includes scope, acceptance criteria, dependencies, and an estimate.

## Epic 0 — Vite + React Bootstrap (Hybrid)
- T-0001 Vite scaffold and config in brain
  - Scope: Initialize `brain/assets` with Vite React TS; set `build.outDir='assets/dist'`, `base='/static/'`, `build.manifest=true`; configure multiple inputs for `main`, `deals_dashboard`, `deal_detail`, `company_detail`, `du_dashboard`.
  - Acceptance: `npm run dev` serves entries; `npm run build` emits hashed assets to `brain/assets/dist` with `manifest.json`.
  - Deps: None.
  - Estimate: 0.5d
  - Status: Completed
- T-0002 Template tag/loader for assets
  - Scope: Add Django helper to inject Vite dev scripts in DEBUG and resolve hashed files from `manifest.json` in PROD.
  - Acceptance: Base template loads correct scripts/styles in both DEBUG and PROD; cache-safe.
  - Deps: T-0001.
  - Estimate: 0.5d
  - Status: Completed
- T-0003 Base template wiring
  - Scope: Update `brain/templates/base.html` to use asset helper; ensure `main` entry loaded globally; add safe mount points convention.
  - Acceptance: Messages render; tooltips/toasts initialized; no 404s for assets.
  - Deps: T-0002.
  - Estimate: 0.25d
  - Status: Completed
- T-0004 Frontend tooling (ESLint/Prettier)
  - Scope: Configure ESLint (TS + React), Prettier, and lint scripts; optional pre-commit.
  - Acceptance: `npm run lint` passes on scaffold; consistent formatting.
  - Deps: T-0001.
  - Estimate: 0.25d
  - Status: Completed

## Epic 1 — Companies Parity
- T-0101 Port companies templates
  - Scope: Compare `aindex-web/templates/companies/*` vs `brain/templates/companies/*`; port missing blocks/partials (panels, includes) while preserving brain context.
  - Acceptance: Company detail displays panels (funding, industries, founders, advisors, patents, grants) without JS errors.
  - Deps: T-0003.
  - Estimate: 0.5–1d
  - Status: Completed (core pages + include ported)
- T-0102 React skeleton for company detail
  - Scope: Add `company_detail` entry; create mount `#company-detail-root` and sub-roots; fetch `/api/companies/companies/{uuid}` and render key panels.
  - Acceptance: Panels render from API with loading/error states; no server-side duplication.
  - Deps: T-0001, T-0003.
  - Estimate: 1–1.5d
  - Status: Completed (About panel island mounted; entry wired; no server duplication)
- T-0103 Grants/Patents CRUD QA
  - Scope: Verify server forms (create/update/delete) flow; adjust templates/redirects; add small UX improvements (toasts). Add “View all” links and simple pagination for Grants and Patent Applications; preserve redirect back to the same paginated view.
  - Acceptance: All CRUD paths work; success messages visible; grants/patents panels show paginated lists with View all/Prev/Next; actions redirect back to the original paginated view.
  - Deps: T-0101.
  - Estimate: 0.5d
  - Status: Completed (server-side pagination + redirect preservation; patent bulk delete server-side form)
- T-0104 Library panel filter/pagination
  - Scope: Add company-scoped Library panel on company detail; fetch related docs from `/api/library/files/?company=<uuid>` (or appropriate filter); implement filter + pagination controls to match grants/patents UX.
  - Acceptance: Documents list visible in a panel; filterable and paginated with View all/Prev/Next; preserves query params.
  - Deps: T-0102.
  - Estimate: 0.5d
  - Status: Completed

## Epic 2 — Deals Shell + Dashboard Data
- T-0201 Add deals URLs and views
  - Scope: Create `brain/apps/deals/urls.py` and thin views (dashboard, fresh, reviewed, missed, detail shell, update shell, assessment shell, delete, refresh, processing-status, dash/data JSON).
  - Acceptance: Server routes respond with templates or JSON; uuid slug in URLs.
  - Deps: T-0003.
  - Estimate: 0.75d
  - Status: Completed
- T-0202 Port deals templates
  - Scope: Copy `aindex-web/templates/deals/*` pages listed in checklists and adapt base/includes.
  - Acceptance: Pages render with placeholders for React mounts; navigation works.
  - Deps: T-0201.
  - Estimate: 1d
  - Status: Completed (shell templates with React mounts in brain/templates/deals/*)
- T-0203 Dashboard JSON aggregation
  - Scope: Implement DealsDashboardDataView with aggregations (date_count_trend, funding_stage_count, industry_count, du_signal_count) per legacy behavior.
  - Acceptance: `/deals/dash/data/` returns expected JSON; used by dashboard.
  - Deps: T-0201.
  - Estimate: 0.75d
  - Status: Completed (added counts and trends; fixed reverse lookup bug using related_query_name)
- T-0204 React dashboard (charts + tables)
  - Scope: Add `deals_dashboard` entry; implement charts with react-chartjs-2 using the JSON view; filter/query params persisted in URL.
  - Acceptance: Charts render and update on filter changes; share color palette with legacy.
  - Deps: T-0203, T-0001.
  - Estimate: 1–1.5d
  - Status: Completed (charts render from JSON, URL filters persist, legacy palette applied; category x-axis used, time adapter optional)

## Epic 3 — Deals Detail & Assessment
- T-0301 Deal detail shell + template
  - Scope: Render shell via server; add `#deal-detail-root`; ensure top metadata visible server-side.
  - Acceptance: Page loads and mount exists; breadcrumb/nav correct.
  - Deps: T-0201, T-0202.
  - Estimate: 0.5d
- T-0302 React deal detail component
  - Scope: Fetch `/api/deals/deals/{uuid}`; render summary, industries, signals, files/papers links; add loading/error states.
  - Acceptance: Data-driven detail; no Jinja duplication.
  - Deps: T-0301.
  - Estimate: 1d
- T-0303 React assessment form
  - Scope: Implement assessment panel (quality percentile, rationale, pros/cons, send_to_affinity) with toggles; submit via DRF or scoped endpoint.
  - Acceptance: Form saves; validation and messages visible; if “send to Affinity”, show notice.
  - Deps: T-0302.
  - Estimate: 1–1.5d
- T-0304 Refresh + processing status
  - Scope: POST `deal-refresh`; poll `processing-status` until `ready`; reload panel/data.
  - Acceptance: Refresh UX works; no spinlocks; exponential backoff.
  - Deps: T-0201.
  - Estimate: 0.5d

## Epic 4 — Dual-use Dashboard
- T-0401 Dual-use URLs and views
  - Scope: Add `brain/apps/dual_use/urls.py` for dashboard and report CRUD shells; map to templates.
  - Acceptance: Routes respond; templates render.
  - Deps: T-0003.
  - Estimate: 0.5d
- T-0402 Port dual-use templates
  - Scope: Copy `aindex-web/templates/dual_use/*` as shells; adjust includes.
  - Acceptance: Pages render with mount `#du-dashboard-root` on dashboard.
  - Deps: T-0401.
  - Estimate: 0.75d
- T-0403 React DU dashboard
  - Scope: Implement charts/tables fetching taxonomy/counts (from `/api/deals/du-signals/` and/or dashboard JSON similar to deals).
  - Acceptance: Charts render; filters update data; colors consistent.
  - Deps: T-0402, (optional JSON agg task).
  - Estimate: 1d

## Epic 5 — Socialgraph/Talents Migration
- T-0501 Founders/advisors React components
  - Scope: Replace legacy talents pages with components using `/api/companies/founders` and `/api/companies/advisors`.
  - Acceptance: Lists render; link to company detail; pagination works.
  - Deps: T-0102.
  - Estimate: 0.75d

## Epic 6 — Library Integrations
- T-0601 Related documents on company/deal
  - Scope: Fetch from `/api/library/files`/`papers` filtered by company/deal; render small tables.
  - Acceptance: Panel shows recent docs; pagination present.
  - Deps: T-0102, T-0302.
  - Estimate: 0.5d

## Epic 7 — Tooling, Tests, and QA
- T-0701 Frontend unit tests setup
  - Scope: Add Vitest/Jest + React Testing Library; write smoke tests for entries/components.
  - Acceptance: `npm run test` green; CI step doc added.
  - Deps: T-0001.
  - Estimate: 0.5d
- T-0702 ESLint/Prettier CI and pre-commit (optional)
  - Scope: Hook lint/format to pre-commit; add GitHub Actions snippet (document-only if CI unavailable).
  - Acceptance: Pre-commit runs locally; docs updated.
  - Deps: T-0004.
  - Estimate: 0.25d
- T-0703 Page parity audit
  - Scope: Compare legacy vs brain for deals/companies/dual-use; collect screenshots and note deltas.
  - Acceptance: Checklist completed; issues filed for gaps.
  - Deps: Epics 1–4.
  - Estimate: 0.75d

## Notes & References
- API docs: `/api/docs/`, `/api/swagger-ui/` (drf-spectacular)
- Filters: see `brain/apps/**/api/filters.py`
- Color palettes: mirror legacy `aindex-web/assets/js/du_charts.js`
- Chart options: mirror legacy `aindex-web/assets/js/deals_charts_options.js`

## Maintenance
- Keep this document up to date: After you complete any ticket, immediately update its Status here and note any deviations from scope or acceptance criteria.
