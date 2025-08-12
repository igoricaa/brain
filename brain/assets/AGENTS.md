# Frontend Assets Guide (Vite + React)

This folder hosts the hybrid frontend for brain using React 19 and Vite 7.1.1.

## Layout

- `vite.config.ts`: base `/static/`, `build.outDir='assets/dist'`, `manifest=true`.
- `src/main.tsx`: single global entry that dynamically imports page modules by `document.body.id`.
- `src/pages/*`: page modules exporting `initialize()` (e.g., `company_detail.tsx`, `deals_dashboard.tsx`).
- `src/lib/*`: shared helpers (e.g., `lib/charts.ts` registers Chart.js + legacy palette).
- `tsconfig.json`: TS settings for Vite React.

## UI Layout Architecture (T-0401 Sidebar Redesign)

- **Layout Structure**: Fixed sidebar navigation (`w-64` left) with content area offset (`ml-64`).
- **Template Integration**: `main.html` loads `includes/sidebar_nav.html` for consistent navigation.
- **Background**: App uses `bg-slate-50` for modern, clean aesthetic.
- **Navigation**: brAINbrAIN branding with dark navy sidebar (`bg-slate-900`).
- **Design System**: Follows fresh deals pattern with colorful metric cards and clean typography.

## Commands (from brain/)

- `npm run dev`: Vite dev server (HMR) at 5173.
- `npm run build`: production build to `assets/dist` with `manifest.json`.
- `npm run lint` / `npm run format`: ESLint + Prettier.

## Django Integration

- Base: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}` only. Page code is lazy-loaded by `main.tsx`.
- Body IDs used by router: `_company-detail`, `_grant-create`, `_deals-dashboard`, `_deals-fresh`, `_deals-reviewed`, `_deal-detail`, `_du-dashboard`, `_founders-list`, `_advisors-list`.

## Adding a New Page Module

1. Create `src/pages/my_page.tsx` that exports `initialize()` and mounts into a known root element.
2. Add a body id in the Django template (e.g., `<body id="_my-page">`).
3. Register it in `pageModules` within `src/main.tsx`: `'_my-page': () => import('./pages/my_page')`.

### People Lists (Founders/Advisors)

- Modules: `src/pages/founders.tsx` and `src/pages/advisors.tsx` mount into `#founders-root` and `#advisors-root` on body IDs `#_founders-list` and `#_advisors-list` respectively.
- Data: `/api/companies/founders` and `/api/companies/advisors` (DRF page-number pagination: `?q=<query>&page=<n>&page_size=30`, optional `ordering=-created_at`).
- Hooks: `src/hooks/usePeople.ts` (`useFounders`, `useAdvisors`) with `keepPreviousData` and 30s `staleTime`.
- UI: shadcn/ui `Input`, `Table`, `Button`, `Badge`, `Skeleton`; Tailwind layout mirrors Fresh Deals header/search/table.
- UX: 300ms debounced search; URL sync for `q` and `page`; Cmd/Ctrl+K focuses search; up to 3 company chips with `+N` overflow.
- Quick preview: In DevTools set `document.body.id` to the body id and append the root div; the page will mount and fetch APIs immediately.

## Notes

- Keep modules small; share logic via `src/components` and `src/lib`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
- React Forms: Use the shared FormRenderer (react-hook-form + zod) with API submission via TanStack Query + Axios. See below.

## Deals Components (React)

### Dashboard (`deals_dashboard.tsx`)

- Module: `src/pages/deals_dashboard.tsx` mounts at `#deals-dashboard-root` on body `#_deals-dashboard`.
- **Design**: Colorful metric cards with icons and period comparisons (Today/Week/Month/Total).
- **Components**: `MetricCard` with colored backgrounds (`bg-blue-100`, `bg-red-100`, etc.), `ChartCard` for data visualization.
- Charts: `react-chartjs-2` + `chart.js`; updated colors (`#3B82F6` blue theme), clean chart styling.
- Data: `/deals/dash/data/`; removed date filters for simplified UX.
- **Recent Activity**: Sample activity feed with emoji indicators and company information.

### Fresh Deals (`deals_fresh.tsx`)

- Module: `src/pages/deals_fresh.tsx` mounts at `#deals-fresh-root` on body `#_deals-fresh`.
- **API**: Uses `status: 'new'` filter with search and infinite scroll.
- **Features**: 300ms debounced search, Cmd+K focus, URL sync, "0 Pending" indicator.

### Past Deals (`deals_reviewed.tsx`)

- Module: `src/pages/deals_reviewed.tsx` mounts at `#deals-reviewed-root` on body `#_deals-reviewed`.
- **API**: Uses `status: 'active'` filter for reviewed deals.
- **Theme**: Green color scheme with "✓ Reviewed" indicator and Export/Filter actions.
- **Features**: Same search/scroll patterns as Fresh Deals with reviewed-specific styling.

## Dependencies

- Runtime: `react`, `react-dom`.
- Charts: `chart.js@^4`, `react-chartjs-2@^5` (installed in `brain/package.json`).
- Forms/API: `react-hook-form`, `@hookform/resolvers`, `zod@^4`, `@tanstack/react-query`, `axios`.
- Async Validation: Built on existing TanStack Query infrastructure with custom hooks and utilities.

## Tailwind CSS (v4)

- Installed: `tailwindcss` and `@tailwindcss/vite` (devDependencies).
- Vite plugin: `tailwindcss()` added in `assets/vite.config.ts`.
- Global CSS: `assets/src/styles/tailwind.css` contains `@import "tailwindcss";` and is imported in `assets/src/main.tsx` so Tailwind is global.
- Template scanning: Tailwind v4 is zero-config; to include server templates outside Vite’s root, `tailwind.css` declares sources:
    - `@source "../templates";`
    - `@source "../apps";`
      This ensures classes used in Django templates are generated without a Tailwind config file.
- Preflight: enabled (default). If conflicting with legacy CSS, consider scoping or disabling selectively.

## React Forms (API mode)

- Component: `src/components/forms/FormRenderer.tsx` (react-hook-form + zod, API submit via TanStack Query + Axios).
- Provider: Wrap mounts in `QueryClientProvider` using `src/lib/queryClient.ts`.
- HTTP: Axios instance is configured in `src/lib/http.ts` with CSRF and DRF error normalization.
- Mount contract (example in Django template):

    ```html
    <div
        id="grant-form-root"
        data-api-endpoint="/companies/grants/"
        data-company="{{ company.uuid }}"
        data-action="{{ request.path }}"
        data-csrf="{{ csrf_token }}"
        data-fields='[{"name":"name","label":"Name","type":"text","required":true}]'
        data-initial="{}"
        data-cancel="{{ request.GET.next|default:'/' }}"
    ></div>
    ```

    - Page id: set `{% block body_id %}_grant-create{% endblock %}` to load the page module.
    - Behavior: On success, redirects to `data-cancel` or `?next=`. DRF field errors are shown inline; `non_field_errors` become a top-level error.

## Deal Assessment (v2)

- Page: `src/pages/deal_assessment.tsx`, mounted on `body#_deal-assessment` into `#deal-assessment-root`.
- API: Uses `/api/deals/assessments/` to create or update the latest assessment for a deal, and `/api/deals/deals/{uuid}/` to toggle `sent_to_affinity`.
- Choices: Quality percentile options are currently hardcoded in the frontend for speed (Most interesting/Top 1%, Very interesting/Top 5%, etc.). Plan to centralize via a small choices endpoint later.
- HTTP rule: Use axios (`http` from `src/lib/http.ts`) for all network calls instead of `fetch` to keep consistent error handling and CSRF behavior.
- Validation: Async validation hooks exist in `src/lib/asyncValidation.ts`, but deal assessment async validation is handled elsewhere and not implemented here.

### Async Validation Support (2025)

FormRenderer now supports real-time async validation with TanStack Query:

#### Field Configuration

```json
{
    "name": "username",
    "label": "Username",
    "type": "text",
    "required": true,
    "asyncValidation": {
        "endpoint": "/api/validate/username/",
        "method": "POST",
        "debounceMs": 500,
        "validateOn": "change",
        "dependencies": ["company"]
    }
}
```

#### Backend Validation Endpoint

Create Django views that return validation responses:

```python
# views.py
class ValidateUsernameView(APIView):
    def post(self, request):
        username = request.data.get('value')
        if User.objects.filter(username=username).exists():
            return Response({'isValid': False, 'error': 'Username already taken'})
        return Response({'isValid': True})
```

#### Async Validation Rules

- **endpoint**: Validation API endpoint (required)
- **method**: 'GET' or 'POST' (default: 'POST')
- **debounceMs**: Debounce delay in milliseconds (default: 500)
- **validateOn**: 'change', 'blur', 'submit', or 'all' (default: 'all')
- **dependencies**: Array of other field names that trigger re-validation
- **enabled**: Boolean to conditionally enable validation
- **transformPayload**: Custom function to transform validation request
- **extractError**: Custom function to extract error from response
- **cacheKey**: Custom cache key generation function

#### Features

- **Real-time validation** with debouncing
- **Smart caching** via TanStack Query (30s stale time, 5min cache)
- **Loading indicators** and error states
- **Dependent field validation** (e.g., validate email format based on selected domain)
- **Form submission blocking** while validation is pending
- **CSRF token handling** for Django integration
- **Error normalization** for consistent UX

#### UI Components

- `ValidationIndicator`: Shows loading/error/success states
- `InlineValidation`: Positioned validation feedback
- `ValidationSummary`: Form-level validation overview
- `ValidatedFieldWrapper`: Complete field with integrated validation

#### Advanced Usage

```typescript
// Custom validation configuration
const asyncValidationConfig = {
  defaultDebounceMs: 300,
  validateOnChange: true,
  validateOnBlur: true,
  endpointPrefix: '/api/v1/validate'
};

// Multi-field dependent validation
{
  "name": "subdomain",
  "asyncValidation": {
    "endpoint": "/api/validate/subdomain/",
    "dependencies": ["domain", "company"],
    "validateOn": "blur"
  }
}
```

#### Performance Considerations

- Validation results cached for 30 seconds
- Automatic request cancellation on rapid changes
- Dependencies trigger immediate re-validation
- Failed validations don't retry automatically
- Background validation doesn't block UI interaction

## Deal Detail — Refresh UX (T-0304)

- Module: `src/pages/deal_detail.tsx`, mounted on `body#_deal-detail` into `#deal-detail-root`.
- Behavior: A top row shows “Last status” and a “Refresh Data” button.
    - On click, POSTs to `/deals/<uuid>/refresh/` (uses a small local CSRF helper) and polls `/deals/<uuid>/processing-status/` with exponential backoff (0.5s → cap 5s, up to 8 attempts).
    - When ready, re-fetches the deal, decks, and papers; the button/status row remains visible and stable to avoid flashing. Only the content panels update.
    - On timeout, shows a non-blocking amber warning.
- Loading Strategy: Full-page skeleton only on first load; re-fetches keep stale content visible (panels may show small inline loaders).
- Note on HTTP: This page uses `fetch` for small server actions to avoid pulling axios into the entry; the broader codebase standardizes on Axios via `src/lib/http.ts`.

## Library Integration (Epic 6)

- Component: `src/components/library/RelatedDocumentsPanel.tsx` renders a Tailwind UI list of library files related to a company.
- API: `/api/library/files/?company=<uuid>&page=<n>&page_size=<m>&source=<uuid>` and `/api/library/sources/`.
- Usage:
    - Deal Detail adds a panel titled "Related Documents" using `RelatedDocumentsPanel` with `paramPrefix="dl_"` so its URL state doesn't collide with other sections.
    - Company Detail already includes a library panel (Bootstrap-styled) and remains unchanged.
- URL Params: `${prefix}page`, `${prefix}size`, `${prefix}all`, `${prefix}source` (Deal uses `dl_` prefix).
- UX: Shows source filter, pagination (Prev/Next), and a range label (e.g., "Showing 1–10 of 42"). Links open in a new tab.

## Navigation Loading Overlay (Aug 2025)

### Problem Addressed
Navigation between React pages showed brief content flash as Django templates loaded before React components mounted. Users experienced jarring flashes of unstyled content during the ~100-200ms gap.

### Technical Solution
**File**: `templates/includes/loading_overlay_complete.html`

Implemented a full-screen loading overlay that:
- **Covers navigation flash**: Professional spinner overlay prevents any flash visibility
- **Perfect timing**: All code inline (HTML + CSS + JavaScript) for zero loading delays
- **React awareness**: Monitors React root elements and removes overlay when components mount
- **Smooth UX**: Elegant fade-out transition when React takes over

### Critical Architecture Decisions

**Why Inline Code is Required**:
- External CSS files create loading delays that allow flash through
- Template includes have microsecond delays that can expose flash
- External JavaScript loads too late to prevent initial flash
- **Key insight**: For timing-critical UX, inline code is the correct technical choice

### Frontend Integration Points

The overlay monitors these React mounting points in `main.tsx`:
```typescript
const roots = ['deals-dashboard-root', 'deals-fresh-root', 'deal-detail-root', 'du-dashboard-root'];
```

**Detection Logic**:
- Polls every 50ms for React components with children
- Triggers smooth opacity fade-out when React content detected
- Removes overlay after 300ms transition completes

### Performance Impact
- **Zero delay**: Overlay appears instantly on navigation
- **Minimal overhead**: Simple polling logic with automatic cleanup
- **Smooth transitions**: Users see professional loading instead of content flash
- **No React deps**: Works independently of React loading state

### Usage
Include in base templates where navigation flash could occur:
```html
{% include 'includes/loading_overlay_complete.html' %}
```

**Critical**: Never extract code from this file - the inline approach is required for perfect timing.

## Research Agent (Frontend-only)

The Research Agent is a frontend-only dashboard that analyzes research papers and teams. It is implemented as a React island loaded via the single-entry router and rendered from a minimal Django shell template. No backend logic or APIs are required to view the page; it uses mock data.

### URL & Template

- URL: `/research-agent/` (project-level route in `brain/brain/urls.py`)
- Template shell: `brain/templates/research/agent.html`
  - Sets `body id="_research-agent"` to trigger lazy-loading of the page module
  - Mount point: `<div id="research-agent-root"></div>`

### Page Registration

- Router: `assets/src/main.tsx`
  - Added `'_research-agent': () => import('./pages/research_agent')`

### Files Added

- Page module:
  - `assets/src/pages/research_agent.tsx`: mounts `ResearchAgentApp` into `#research-agent-root`.
- Components:
  - `assets/src/components/research/FeaturedAnalysis.tsx` (Card + ScrollArea + Markdown)
  - `assets/src/components/research/TeamAnalysis.tsx` (Card + ScrollArea + Markdown)
  - `assets/src/components/research/PapersList.tsx` (list of papers, citations, external links, expandable markdown evaluation)
  - `assets/src/components/research/TeamMembersList.tsx` (list of members, expandable analysis)
- Common:
  - `assets/src/components/common/Markdown.tsx` (minimal, safe markdown: H1/H2/H3, `- ` bullets, `**bold**`, `[text](url)`)
- UI helpers:
  - `assets/src/components/ui/scroll-area.tsx` (simple overflow container)
  - `assets/src/components/ui/collapsible.tsx` (lightweight wrappers; triggers use Button ghost variant)
- Mocks:
  - `assets/src/lib/mocks/research_agent.ts` (research analysis, papers, team analysis, team members)

### Design & Guidelines Alignment

- Layout: top grid with Featured Analysis (xl:col-span-2) and Team Analysis; bottom grid with Papers and Team Members (xl:2 columns).
- Borders: lists use `divide-y divide-border` per design tokens; no per-item hard-coded border colors.
- Cards: rely on shadcn `Card` (`border`, `shadow-sm`, `bg-card`, `text-muted-foreground`).
- Accordion: `Button variant="ghost" size="sm"` as trigger with chevron that rotates (`rotate-90`) on expand, `aria-expanded` set.
- Markdown: wrapped in `prose prose-sm max-w-none`; links validated to http(s), open in new tab with external-link icon.
- Accessibility: headings maintain hierarchy; triggers carry `aria-expanded` and inherit focus-visible ring from Button.

### Sidebar Navigation

- Updated `templates/includes/sidebar_nav.html`:
  - The "Research Agent" link points to `{% url 'research-agent' %}` and highlights when `'/research-agent' in request.path`.

### Future Enhancements

- Replace mock data with APIs (e.g., `/api/research/analysis`, `/api/research/papers`, `/api/research/team`, `/api/research/members`) using `http` (axios) per repo standards.
- Optionally migrate collapsible/scroll-area to Radix primitives once dependencies are approved.
- Add filters/sorting for papers and team members if needed.
