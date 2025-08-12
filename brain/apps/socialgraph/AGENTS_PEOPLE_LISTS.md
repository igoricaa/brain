# People Lists (Founders & Advisors)

Frontend-only React pages rendering founders and advisors with Tailwind + shadcn/ui. These replace legacy `talents` list views and consume companies endpoints.

## Mounts and Routing

- Founders page
  - Body id: `#_founders-list`
  - Root: `<div id="founders-root"></div>`
  - Module: `assets/src/pages/founders.tsx`

- Advisors page
  - Body id: `#_advisors-list`
  - Root: `<div id="advisors-root"></div>`
  - Module: `assets/src/pages/advisors.tsx`

- Router registration: in `assets/src/main.tsx`

```ts
const pageModules = {
  '_founders-list': () => import('./pages/founders'),
  '_advisors-list': () => import('./pages/advisors'),
  // ...others
} as const;
```

## APIs and Data Shape

- Endpoints (existing): `/api/companies/founders`, `/api/companies/advisors`
- Pagination: DRF PageNumber (`page`, `page_size`, `count`, `next`, `previous`)
- Search: `q` (configured in settings `SEARCH_PARAM`)
- Ordering: `ordering` (default used here: `-created_at`)

TypeScript types in `assets/src/lib/types/people.ts` mirror the serializers used by companies APIs (optional fields kept flexible for robustness):

```ts
export interface CompanyMini { uuid: string; name: string; website?: string | null; image?: string | null }
export interface FounderCompany extends CompanyMini { title?: string | null }
export interface Founder { uuid: string; name: string; linkedin_url?: string | null; location?: string | null; country?: string | null; companies: FounderCompany[] }
export interface Advisor { uuid: string; name: string; linkedin_url?: string | null; location?: string | null; country?: string | null; companies: CompanyMini[] }
export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
```

## Hooks

`assets/src/hooks/usePeople.ts`

- `useFounders(params)` / `useAdvisors(params)`
  - Params: `{ q?, page?, page_size?, ordering? }`
  - Behavior: `keepPreviousData` for smooth paging; `staleTime: 30s`.

## UI Components

- `PeopleList.tsx`: page header + search (shadcn `Input`), debounced 300ms, URL sync for `q` and `page`, Prev/Next pagination.
- `PeopleTable.tsx`: shadcn `Table`; Name (+ LinkedIn icon), Location, Companies (chips up to 3 with `+N` overflow badge). Skeleton loader on initial fetch.
- Styling: Tailwind + shadcn/ui consistent with Fresh Deals page and target design screenshots (1, 2).
- Accessibility: Keyboard shortcut Cmd/Ctrl+K focuses search input.

## Testing/Preview Tips

- Quick-inject without templates (DevTools):
  - Founders: `document.body.id = '_founders-list'; const r = document.createElement('div'); r.id = 'founders-root'; (document.querySelector('#content')||document.body).appendChild(r);`
  - Advisors: `document.body.id = '_advisors-list'; const r = document.createElement('div'); r.id = 'advisors-root'; (document.querySelector('#content')||document.body).appendChild(r);`

## Future Enhancements

- Add clean server routes and shells at `/people/founders/` and `/people/advisors/`.
- Extend filters (country, has_military, schools) once product wants parity with v1.
- Person detail or modal preview (optional) and richer chips (roles/titles, hover cards).

