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

## Epic 2.5 — Deals List Views (React Components)
- T-0205 React fresh deals list
  - Scope: Create `pages/deals_fresh.tsx` with complete table replication of legacy fresh deals. Implement 5-column layout: Company (with processing icon + naturaltime), Fundraise (funding_target + stage), Industries (colored tags), Dual-use signals (colored category tags + "other" for uncategorized), Grants (count with proper pluralization). Use endless scroll pagination via el-pagination pattern replacement (load more on scroll or "show more" button). Integrate search functionality with query parameter `q` that searches company names. Handle processing deck status display (spinner icon for `has_processing_deck` deals). Mount into `#deals-fresh-root` on body `#_deals-fresh`. 
  - API Integration: Fetch `/api/deals/deals/?status=fresh` with proper ordering by `-created_at`. Apply search filter via `q` param. Use industry/dual-use-signal nested serializers for tags display. Handle pagination with cursor or page-based approach matching legacy el-pagination behavior.
  - UI/UX: Replicate exact column layout with Bootstrap 5 classes (`.deal-row`, `.deal-col`, `.deal-index`). Show document.svg icon for normal deals, fa-spinner for processing. Display naturaltime using dayjs or similar for "2 hours ago" format. Apply proper industry/dual-use tag styling with background/text colors from API. Include grants count with proper i18n pluralization. Maintain hover states and link styling to match legacy.
  - Technical Details: Add router entry `'_deals-fresh': () => import('./pages/deals_fresh')` to main.tsx. Create reusable components: `DealRow`, `IndustryTags`, `DualUseSignalTags`, `ProcessingStatus`. Use TanStack Query for data fetching with proper loading states. Handle empty states and error conditions. Implement infinite scroll with intersection observer or manual "Load More" button as fallback.
  - Acceptance: Fresh deals page displays exact replica of legacy table layout. Search works with debounced query. Pagination loads more deals smoothly. Processing indicators show correctly. All links navigate properly. Industries and dual-use signals display with correct colors. Grants count shows with proper pluralization. No layout shifts or flashing. Performance matches or exceeds legacy.
  - Deps: T-0202 (shell template exists), T-0001 (Vite setup).
  - Estimate: 2d
  - Status: Pending
- T-0206 React reviewed deals list  
  - Scope: Create `pages/deals_reviewed.tsx` extending fresh deals layout with additional Assessment column. Show recommendation status (call/pass with color coding), Affinity sync status badge ("Not sent to Affinity" warning). Handle all existing columns from fresh deals plus assessment-specific data. Implement same search and pagination patterns as fresh deals.
  - API Integration: Fetch `/api/deals/deals/?status=reviewed` with proper joins to assessment data. Use deal recommendation field mappings (PREP_TO_CALL → "call" text-success, PREP_TO_PASS → "pass" text-danger, others → muted display). Check `sent_to_affinity` boolean for badge display. Handle assessment relationship properly (may be null for older deals).
  - UI/UX: Add 6th column for Assessment with recommendation display. Use semantic colors for call (green) / pass (red) recommendations. Show warning badge for `sent_to_affinity=false` deals. Maintain all styling from fresh deals table. Handle center alignment for assessment column with flex-column layout. Include search form in page header matching legacy.
  - Technical Details: Extend `DealRow` component with assessment props. Create `AssessmentStatus` component for recommendation display. Handle conditional badge rendering for Affinity status. Reuse industry/dual-use/processing components from fresh deals. Add proper TypeScript interfaces for assessment data. Include pagination and search from T-0205 patterns.
  - Acceptance: Reviewed deals display with assessment column showing proper call/pass colors. Affinity sync warnings appear correctly. All fresh deals functionality preserved. Search works across company names. Page header includes search form. Pagination and performance match fresh deals.
  - Deps: T-0205 (shares components), T-0202 (shell template), T-0303 (assessment endpoints exist).
  - Estimate: 1.5d
  - Status: Pending  
- T-0207 React missed deals list
  - Scope: Create `pages/deals_missed.tsx` with distinct layout for missed deal data structure. Implement 5-column layout: Company (logo + name + location + funding stage), Description (truncated summary), Technology/Industries (technology_type tag + industry tags), Last Funding (amount + date), Total Funding (amount + rounds count with pluralization). Use different data model (MissedDeal vs Deal) with different field structure and relationships.
  - API Integration: Create or extend API for missed deals at `/api/deals/missed/` or equivalent. Handle MissedDeal model with fields: name, hq_location, summary, last_funding_amount, last_funding_date, total_funding_amount, funding_rounds_count. Include relationships to Company (for logo, industries, technology_type). Handle potential null company relationships gracefully.
  - UI/UX: Use `.list-row`/`.list-col` classes instead of deal-row. Show company logos with fallback to logo.svg. Display location and funding stage as secondary info. Truncate description to ~200 chars with proper ellipsis. Show technology type as dark tag, industries as mapped colored tags. Format funding amounts with intword_usd logic ($1.2M, $500K). Display funding date as "Jan 2023" format. Handle pluralization for "funding round" vs "funding rounds".
  - Technical Details: Create `MissedDealRow` component distinct from regular DealRow. Implement `FundingDisplay` component for amount formatting. Reuse `IndustryTags` but handle company.industries relationship. Create `CompanyLogo` component with fallback logic. Handle truncation with CSS or JS. Use same pagination patterns as other deal lists but adapt for MissedDeal model.
  - Acceptance: Missed deals display with company-focused layout. Logos display with fallbacks. Location and funding stage show as secondary info. Technology type and industries display with proper styling. Funding amounts format correctly with K/M suffixes. Funding dates show as "Month Year". Rounds count pluralizes correctly. Description truncates properly. Pagination works smoothly.
  - Deps: T-0202 (shell template), T-0205 (pagination patterns), API endpoints for missed deals.
  - Estimate: 2d
  - Status: Pending
- T-0208 Deal lists search and filters unification
  - Scope: Add consistent search functionality across all three deal list types. Implement header search form with query parameter persistence. Add optional advanced filters (date ranges, industries, funding stages, dual-use categories). Create shared search/filter UI components. Handle URL state synchronization for bookmarkable filtered views.
  - Search Implementation: Use debounced search input with 300ms delay. Submit via query params (`?q=search+term`) maintaining pagination state. Implement server-side full-text search via SearchVector on company names, deal names, descriptions. Clear search functionality with X button. Maintain search state across navigation.
  - Filter Implementation: Add collapsible advanced filters panel. Include date range picker for created_at/updated_at filtering. Multi-select for industries with checkboxes and search. Multi-select for dual-use categories with color previews. Funding stage dropdown filter. Apply filters via query params with proper encoding. Show active filter count and clear all option.
  - Technical Details: Create `DealSearchForm` and `DealFilters` components. Implement `useSearchParams` hook for URL state management. Add debounced search hook with abort controller. Create filter serialization/deserialization utilities. Handle complex query param encoding for arrays. Add clear search/filters functionality. Ensure back button navigation preserves state.
  - UI/UX: Match legacy search form styling in page headers. Add filter toggle button with active count badge. Use collapsible panel for advanced filters. Show loading states during search. Display active filters as removable chips. Include results count display. Handle empty search results gracefully.
  - Acceptance: Search works across all deal list types with debounced input. Advanced filters apply correctly with URL persistence. Filter chips show active selections. Search/filter state survives browser back/forward. Empty states display appropriately. Loading indicators appear during searches. Results count updates correctly.
  - Deps: T-0205, T-0206, T-0207 (base list components), API filter enhancements.  
  - Estimate: 1.5d
  - Status: Pending

## Epic 3 — Deals Detail & Assessment
- T-0301 Deal detail shell + template
  - Scope: Render shell via server; add `#deal-detail-root`; ensure top metadata visible server-side.
  - Acceptance: Page loads and mount exists; breadcrumb/nav correct.
  - Deps: T-0201, T-0202.
  - Estimate: 0.5d
  - Status: Completed (SSR header + Tailwind breadcrumb, single-entry router wired)
- T-0302 React deal detail component
  - Scope: Fetch `/api/deals/deals/{uuid}`; render summary, industries, signals, files/papers links; add loading/error states.
  - Acceptance: Data-driven detail; no Jinja duplication.
  - Deps: T-0301.
  - Estimate: 1d
  - Status: Completed (React detail page with Tailwind panels; fetches deal, decks, and papers; loading/error states; no server duplication)
- T-0303 React assessment form
  - Scope: Implement assessment panel (quality percentile, rationale, pros/cons, send_to_affinity) with toggles; submit via DRF or scoped endpoint.
  - Acceptance: Form saves; validation and messages visible; if "send to Affinity", show notice.
  - Deps: T-0302.
  - Estimate: 1–1.5d
  - Status: Completed (DRF assessments endpoint added; React form via FormRenderer + axios; inline success banner with back link; choices hardcoded and documented)
- T-0304 Refresh + processing status
  - Scope: POST `deal-refresh`; poll `processing-status` until `ready`; reload panel/data.
  - Acceptance: Refresh UX works; no spinlocks; exponential backoff.
  - Deps: T-0201.
  - Estimate: 0.5d
  - Status: Completed (server endpoints implemented with ProcessingStatus; frontend Refresh button with exponential backoff polling and data reload; readiness checks include deal + file statuses)

## Epic 4 — Dual-use Dashboard
- T-0401 Dual-use URLs and views
  - Scope: Add `brain/apps/dual_use/urls.py` for dashboard and report CRUD shells; map to templates.
  - Acceptance: Routes respond; templates render.
  - Deps: T-0003.
  - Estimate: 0.5d
  - Status: Completed (URLs included under `dual-use/`, thin views render shell templates, dashboard mount added, `summary-data` stub route present)
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
