# Socialgraph App Guide

Purpose: people profiles used by founders and advisors.

## Model
- `Profile` (polymorphic): name, bio, linkedin_url, country/location, education, experiences, military/gov background; public `uuid`.
- Companies app specializes this via `Founder` and `Advisor` and relations.

## APIs
- Exposed through companies endpoints: `/api/companies/founders` and `/api/companies/advisors`.

## Migration from Talents (legacy)
- aindex-web `talents` maps to `socialgraph.Profile` + companies relations. Replace legacy templates and forms with API-driven React components.

## People Lists (Founders/Advisors)

- Purpose: Frontend-only React pages listing Founders and Advisors, replacing legacy `talents` list views while using existing companies APIs.
- APIs: `/api/companies/founders` and `/api/companies/advisors` (DRF PageNumber pagination, `SEARCH_PARAM=q`, default `PAGE_SIZE=30`).
- Frontend modules (Vite + React):
  - `assets/src/pages/founders.tsx` → body `#_founders-list`, mounts into `#founders-root`.
  - `assets/src/pages/advisors.tsx` → body `#_advisors-list`, mounts into `#advisors-root`.
- Components and hooks:
  - Types: `assets/src/lib/types/people.ts` (Founder/Advisor + nested companies and Paginated<T>).
  - Hooks: `assets/src/hooks/usePeople.ts` (`useFounders`, `useAdvisors`) with `q`, `page`, `page_size`, `ordering`.
  - UI: `assets/src/components/people/PeopleList.tsx`, `PeopleTable.tsx` using shadcn/ui (`Input`, `Table`, `Button`, `Badge`, `Skeleton`).
- UX specifics:
  - Debounced search (300ms) on `q`; URL sync for `q` and `page` (resets to page 1 on query change).
  - Pagination: Prev/Next buttons driven by `count` with default page size 30.
  - Company chips: up to 3 related companies shown (avatar/name) linking to `/companies/<uuid>/`, with a `+N` overflow badge.
  - Keyboard: Cmd/Ctrl+K focuses search (parity with Fresh Deals page).
  - Styling: Tailwind + shadcn/ui; header/search/table mirror Fresh Deals layout; ready to refine to screenshots in local desktop (“1”, “2”).
- Notes:
  - No backend code changes introduced by this task; endpoints already exist under the companies app.
  - For clean URLs, add thin shells under `brain/templates/people/*` with the body IDs and root divs; not required for the hybrid mount/testing.
