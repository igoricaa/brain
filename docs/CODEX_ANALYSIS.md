# Frontend Architecture Review — brain (v2)

This document captures a deep analysis of the v2 frontend (React + Vite + Tailwind) integrated with Django templates, along with a proposed checklist of improvements. It consolidates findings from AGENTS.md files, docs/design.md, and a code scan across `brain/assets/*` and `brain/templates/*`.

## Big Picture
- Hybrid app: Django templates with React “islands” mounted per-page, lazy-loaded via a single Vite entry (`assets/src/main.tsx`).
- Tooling: Vite 7, React 19, Tailwind v4 (@source scanning), axios-based `http` client for `/api` (DRF), TanStack Query for data.
- Scope: Deals (fresh/past/dashboard/detail/assessment), Companies (detail + library), Dual-use dashboard, People listings, and a robust File Manager (draft/existing/library modes).

## What’s Excellent
- Single-entry router: clean dynamic imports keyed by `<body id=...>`; avoids React preamble issues and improves code-splitting.
- Tailwind v4 integration: minimal setup, bright theme tokens, predictable card/layout conventions.
- UI consistency: shadcn/ui + Tailwind across modern pages; shared chart palette.
- Forms: React Hook Form + Zod + async validation (TanStack Query) with debouncing/caching; `FormRenderer` is a solid abstraction.
- Data fetching patterns: Debounced search, `keepPreviousData`, IntersectionObserver—smooth lists UX.
- File Manager + Draft persistence: advanced, production-aware design (compression, IndexedDB fallback, integrity checks, conflict detection).
- Documentation: AGENTS.md and design docs describe intent and implementation details clearly.

## Key Risks and Issues
- Loading overlay can block non-React pages
  - `templates/includes/loading_overlay_complete.html` is included globally (base.html). Its hide logic polls for a fixed set of React roots; on pages without those roots, overlay never goes away.
  - Options: include only on pages with React islands; or add a fallback timer (remove after ~400–600ms if no roots detected); or detect general page readiness and remove.

- Inconsistent HTTP usage (fetch vs axios)
  - AGENTS.md prefers axios via `lib/http.ts` for CSRF + DRF error normalization, but many pages use `fetch` (deal detail, dashboard, company detail, dual-use, related documents). Fragmented error/CSRF handling and duplicate cookie/headers code result.

- Verbose debug logging in production paths
  - `useDraftPersistence.ts` and `utils/fileOperations.ts` contain extensive `console.*` logs that run unconditionally. Adds noise and small runtime overhead.
  - Gate logs by environment or a tiny logger; strip in production builds.

- CSP fragility of inline overlay
  - Overlay relies on inline CSS and JS for timing-critical behavior. A strict CSP (no `unsafe-inline`) would break it.

- Mixed entry strategy causes extra payload
  - `vite.config.ts` still lists legacy inputs and some templates still call `{% vite_asset 'src/pages/*.tsx' %}` while base includes `src/main.tsx`. Leads to duplicate downloads.

- Repeated patterns without shared helpers
  - URL param helpers (`useQueryParams`) re-implemented across modules. Library fetching logic duplicated between `RelatedDocumentsPanel` and `company_detail.tsx`.

- External links omit `noopener`
  - Several `target="_blank"` links use `rel="noreferrer"` but not `noopener` (risk: window.opener).

## Performance Observations
- Good: dynamic imports, TanStack Query settings, debounced search, IntersectionObserver lists, one-time Chart.js registration.
- Opportunities: remove legacy inputs and extra `{% vite_asset %}` calls; gate/strip logs; optionally lazy-load charts or swap to a lighter chart lib where acceptable.

## Security Observations
- Good: axios CSRF settings, aggressive error sanitization and schema validation, file size/quota limits.
- Opportunities: standardize on axios for all requests; add `rel="noopener noreferrer"` to external links; consider top-level error boundaries for React islands.

## Architecture & DX
- Good: single-entry router + `initialize()` export, strong docs, TS strict mode, ESLint/Prettier.
- Opportunities: extract shared URL and library hooks; enforce “use `http` for API” via lint or docs; provide a small `serverHttp` for non-API endpoints to retire `fetch` without bending `http`’s `/api` baseURL.

## Template Integration
- Good: base includes `main.tsx`; body IDs map to page modules; clear mount points.
- Issue: global loading overlay is the main footgun (see above).

## File Manager System
- Strengths: thoughtful persistence architecture (compression, chunking, IndexedDB fallback, schema validation, index repair) and robust UX.
- Caution: reduce production logging; mindful of browser storage nuances.

---

## Proposed PR Checklist

- HTTP client standardization (axios)
  - [ ] Create `assets/src/lib/httpServer.ts` (axios instance with `baseURL: '/'`, `withCredentials`, CSRF headers) for non-API server endpoints.
  - [ ] Replace fetch with `http` (for `/api/*`) or `serverHttp` (for non-API endpoints) in:
        - `assets/src/pages/deal_detail.tsx` (deal, files, assessments)
        - `assets/src/pages/deals_dashboard.tsx` (`/deals/dash/data/`)
        - `assets/src/pages/company_detail.tsx` (company + library)
        - `assets/src/pages/du_dashboard.tsx` (du-signals; summary)
        - `assets/src/components/library/RelatedDocumentsPanel.tsx`
  - [ ] Remove manual CSRF cookie parsing in favor of axios XSRF config.
  - [ ] Use/retain `normalizeDrfErrors` where DRF endpoints return validation structures.

- Single-entry migration clean-up
  - [ ] Remove legacy rollup inputs from `vite.config.ts` once all pages are registered in `main.tsx`.
  - [ ] Remove `{% vite_asset 'src/pages/*.tsx' %}` in templates now covered by single-entry loader.

- Loading overlay (you’ll do later — tracked here)
  - [ ] Limit inclusion to pages with React islands or add a safe fallback removal if no roots are detected.
  - [ ] Keep timing-sensitive behavior; consider CSP implications if moving away from inline.

- External links (you’ll do later — tracked here)
  - [ ] Sweep for `target="_blank"` and add `rel="noopener noreferrer"` everywhere (templates + TSX).

- Shared helpers & hooks
  - [ ] Extract a single `useUrlParams` hook (update pages to use it).
  - [ ] Extract `useLibrarySources` and `useLibraryFiles` into `hooks/library.ts` and reuse in both company and deal contexts.

- Logging hygiene
  - [ ] Gate or remove verbose `console.*` in `useDraftPersistence.ts` and `utils/fileOperations.ts` for production builds.
  - [ ] Optionally introduce a tiny logger with levels (dev vs prod).

- Optional improvements
  - [ ] Add a top-level `QueryClientProvider` (layout island) to reuse cache between islands when beneficial.
  - [ ] Consider dynamic imports for charts or lighter charting for non-critical visuals.

---

## Plan: Fetch → Axios Migration (for approval)

1) Inventory & categorize endpoints
- /api (DRF): should use `http` (existing axios instance with `baseURL: '/api'`).
- Non-API server routes (Django views): should use a new `serverHttp` (axios with `baseURL: '/'`) to preserve same-origin cookies + CSRF while not inheriting `/api`.

2) Introduce `serverHttp`
- File: `assets/src/lib/httpServer.ts`
- Config: `{ baseURL: '/', withCredentials: true, xsrfCookieName: 'csrftoken', xsrfHeaderName: 'X-CSRFToken' }`
- Rationale: keep API and server concerns clean; avoid path mistakes like `/api/deals/dash/data/`.

3) File-by-file replacements
- `assets/src/pages/deal_detail.tsx`
  - Replace all fetch calls hitting `/api/deals/*` with `http.get/patch/post`.
  - Remove manual `getCookie` and headers; rely on `http` XSRF settings.
  - Keep local component-level error handling; throw `Error` on non-2xx and surface messages consistently.

- `assets/src/pages/deals_dashboard.tsx`
  - Replace fetch(`/deals/dash/data/`) with `serverHttp.get('/deals/dash/data/', { params })`.

- `assets/src/pages/company_detail.tsx`
  - `useCompany`: `http.get('/companies/companies/{uuid}/')`.
  - Library sources/files: `http.get('/library/sources')` + `http.get('/library/files', { params })`.

- `assets/src/pages/du_dashboard.tsx`
  - Categories: `http.get('/deals/du-signals/', { params: { page_size: 500 } })`.
  - Summary: `http.get('/dual-use/summary', { params })`.

- `assets/src/components/library/RelatedDocumentsPanel.tsx`
  - Convert sources/files to `http.get` with params.

4) Error normalization
- Use `normalizeDrfErrors` only for DRF validation errors (forms/mutations). For pure GET JSON endpoints, map errors to concise UI messages.

5) Verification
- Build + lint.
- Manual smoke on: Deals Dashboard, Deal Detail (including save assessment), Company Detail (About + Library), Dual-use Dashboard, Related Documents panel.
- Confirm CSRF works without manual cookie parsing; confirm JSON shapes unchanged.

6) Risks & mitigations
- Risk: path collision by accidentally prepending `/api` to server routes — mitigated by `serverHttp` separation.
- Risk: minor differences in error object shape — mitigated by explicit try/catch and message mapping.

If approved, I’ll implement `serverHttp`, update the listed files, and run lint/build to validate.

---

## Notes for Later (deferred by request)
- Loading overlay improvements: implement safer removal logic and/or conditional include.
- External link hardening: add `rel="noopener noreferrer"` to all `target="_blank"` links across templates and TSX.

