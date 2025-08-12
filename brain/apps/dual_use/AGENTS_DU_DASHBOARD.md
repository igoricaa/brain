# Dual-use Dashboard — Engineering Notes

This document describes the architecture and logic for the Dual-use dashboard in v2 (brain).

## Overview
- Purpose: visualize distributions for companies linked to deals with Dual-use signals (taxonomy from `deals.DualUseSignal`).
- Approach: A React island renders charts from a single DRF summary endpoint, keeping the client light and avoiding expensive client-side aggregation.

## Server API
- Endpoint: `GET /api/dual-use/summary/`
- Filters (query params):
  - `category_name` — Dual-use category name (case-insensitive exact match)
  - `hq_country` — Company HQ country code (ISO alpha-2)
- Query logic:
  1. Base queryset starts with `Deal.objects.filter(dual_use_signals__isnull=False)`.
  2. If `category_name` is provided, restrict by `dual_use_signals__category__name__iexact`.
  3. Derive companies via `Company.objects.filter(deal__in=deals_qs).distinct()`.
  4. Optional `hq_country` filter applied at the company level.
  5. Aggregations computed with `values(...).annotate(count=Count('id', distinct=True))` and sorted by `-count`.
  6. Industries (M2M) handled separately by grouping on `industries__name`.
- Response body:
  ```json
  {
    "hq_country_company_count": [{"name": "US", "count": 42}, ...],
    "hq_state_company_count": [{"name": "CA", "count": 17}, ...],
    "hq_city_company_count": [{"name": "San Francisco", "count": 9}, ...],
    "tech_type_company_count": [{"name": "AI", "count": 21}, ...],
    "industries_company_count": [{"name": "Defense", "count": 13}, ...],
    "year_founded_company_count": [{"name": 2020, "count": 8}, ...],
    "founders_count_company_count": [{"name": 2, "count": 19}, ...]
  }
  ```

## Frontend
- Entry: `brain/assets/src/pages/du_dashboard.tsx`; mounted on `#du-dashboard-root` in `dual_use/dashboard.html`.
- Data sources:
  - Categories: `/api/deals/du-signals/?page_size=500` (de-duplicate by `category.name`).
  - Summary: `/api/dual-use/summary/` with current query params.
- UX:
  - Filters for DU Category and HQ Country; changes persist in the URL via `history.replaceState`.
  - Charts: pie charts for HQ distributions; bar charts for technology, industries, year founded, founders count.
- Shared libs: chart palette/options in `src/lib/charts.ts`.

## Rationale
- v1 (legacy) used a server-side aggregate endpoint (`/dual-use/summary/data/`) consumed by dashboard JS; this mirrors the pattern in v2, but formalized under DRF.
- Avoids client-side pagination over deals + per-company hydration, which would be inefficient and brittle.

## Extending
- Add filters (e.g., `industry`, year range) by expanding query params and applying them prior to aggregation.
- Add new groupings (e.g., top schools, investors) by following the `aggregate()` pattern or M2M-specific grouping.

## Notes
- There is a legacy placeholder view `dual_use.views.summary_data` from early scaffolding; React now uses the DRF endpoint. Remove it when convenient.

