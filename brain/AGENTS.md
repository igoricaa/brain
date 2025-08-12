# Brain v2 Guide

This is the v2 Django project and API. Frontend moves here using a hybrid Django + Vite/React approach now, evolving to a standalone SPA later.

## Layout & Settings
- Project: `brain/brain/{settings.py,urls.py,api_urls.py}`; `INSTALLED_APPS` includes `companies`, `deals`, `dual_use`, `library`, `locations`, `socialgraph`, `users`, `common`.
- **Templates**: `brain/templates` (extends `base.html`, `main.html`). **NEW**: Fixed sidebar layout with `includes/sidebar_nav.html`.
- **Layout Architecture**: Sidebar navigation (`w-64` fixed left) with content offset (`ml-64`). Background: `bg-slate-50`.
- Static: `STATICFILES_DIRS` includes `assets/dist` (Vite build output).
- Auth: Allauth + OAuth2; DRF auth via session or token scopes.

## API Surface
- Router: `brain/brain/api_urls.py` composes app routers under `/api/`.
- Docs: `/api/docs/`, `/api/swagger-ui/`, `/api/schema/` (drf-spectacular).

## Frontend Strategy
- Hybrid: Django routes + React islands; fetch data from `/api/*`.
- Vite: `brain/assets` (React 19, Vite 7.1.1) with `build.outDir='assets/dist'`, `base='/static/'`, `manifest=true`.
- **Single-Entry Architecture**: Main.tsx acts as router, dynamically imports page modules based on `document.body.id`.
- Asset tags: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}` in base template only.
- Legacy entries (being phased out): `deals_dashboard`, `deal_detail`, `du_dashboard`.

### HTTP Client Rule
- Use axios via `assets/src/lib/http.ts` for all network calls instead of `fetch` to ensure consistent CSRF handling and unified error normalization (`normalizeDrfErrors`).

### React Forms Standard (2025)
- We are standardizing on React forms across v2 to avoid server-side widget styling and to enable a smooth migration to a full SPA later.
- Form engine: `react-hook-form` + `@hookform/resolvers` + `zod` (v4) for schema validation.
- **Async Validation**: Real-time server-side validation with TanStack Query, debouncing, caching, and loading states.
- UI: Tailwind utilities (shadcn/ui compatible). No global Tailwind base overrides for Django widgets are required when using React forms.

#### How islands load
- `src/main.tsx` contains a `pageModules` registry. Each Django template sets a `body id` to opt-in a page module.
- Example registry entries:
  - `'_company-detail'`: `() => import('./pages/company_detail')`
  - `'_grant-create'`: `() => import('./pages/company_detail')` (reuses the same module which mounts the React FormRenderer)

#### Using the React FormRenderer
- Mount container in a Django template:
  ```html
  <div
    id="grant-form-root"
    data-action="{{ request.path }}{% if request.GET.next %}?next={{ request.GET.next|urlencode }}{% endif %}"
    data-csrf="{{ csrf_token }}"
    data-fields='[{"name":"name","label":"Name","type":"text","required":true,"asyncValidation":{"endpoint":"/api/validate/name/","debounceMs":500}}]'
    data-initial='{}'
    data-cancel="{{ request.GET.next|default:'/' }}"
  ></div>
  ```
- The page must set a `body id`, e.g. `{% block body_id %}_grant-create{% endblock %}`, to trigger lazy-loading.
- Cancel navigation: use the `?next=` query param whenever linking to create/update pages to guarantee a good return URL.
- **Async validation**: Add `asyncValidation` config to field definitions for real-time server validation (see `brain/assets/AGENTS.md` for details).

#### Why no Tailwind base for Django widgets?
- Since forms render as React islands, we do not rely on `{{ form.as_p }}` styling. This avoids maintaining global CSS overrides for Django widgets. You can still add base styles if you have legacy pages, but new work uses the React FormRenderer.

#### Optional serializer for forms (recommended)
- Purpose: Convert a Django `Form`/`ModelForm` into a `FormFieldDef[]` JSON descriptor so templates don’t hand-author field lists.
- Benefits:
  - Single source of truth for required/labels/help text/options.
  - Keeps React form in sync with server-side validation and widgets.
- Shape:
  ```ts
  interface FormFieldDef {
    name: string; label: string; type: 'text'|'textarea'|'number'|'select'|'date'|'checkbox';
    required?: boolean; placeholder?: string; helpText?: string; options?: {label:string; value:string;}[];
    min?: number; max?: number; pattern?: string;
  }
  ```
- Usage:
  - In the Django view, serialize the form fields to JSON and pass to the template as `fields_json`.
  - In the template: `data-fields='{{ fields_json|safe }}'`.


## UI Conventions (Companies)
- Company detail grants/patents panels are paginated server-side with a “View all” toggle.
- Query params: Grants `g_page/g_size/g_all`, Patents `p_page/p_size/p_all` (default page size = 5).
- CRUD flows include a `next` param and redirect back to the same paginated view after actions; patent bulk delete uses a single POST form with checkboxes named `patent_applications`.
 - React forms: `grant_create.html` uses a React island. `body id="_grant-create"` triggers the lazy-loaded page module which mounts the FormRenderer.

## Useful Paths
- Companies templates/views: `brain/apps/companies/views/*`, `brain/apps/companies/urls.py`, templates under `brain/templates/companies/`.
- Deals/Dual-use/Library: API implemented, server views/urls to add as needed (see app guides).
- Template tags: `apps/common/templatetags/brain.py` (filters: `intword_usd`, `url_display`). Use `django_vite` tag library for assets.

## Recent Changes (compact)
- T-0102 Companies: About card moved to React island (`#company-about-root`) via single-entry router; removed server duplication.
- T-0104 Library: Company-scoped Library panel island (`#company-library-root`) with source filter + pagination; backend filter `?company=<uuid>` added.
- T-0201 Deals: Added server URLs and thin views; included under `path('deals/', ...)` in project `urls.py`.
- T-0202 Deals: Ported shell templates with React mounts (dashboard, lists, detail, assessment, delete, deck create).
- T-0203 Deals: Implemented dashboard JSON aggregations at `/deals/dash/data/` (trend, distributions, counts).
- T-0204 Deals: Built React dashboard (charts + metrics) loaded via single-entry router on `#_deals-dashboard`; added Chart.js + react-chartjs-2 with legacy color palette.
- Bugfix: Reverse lookups in dashboard JSON use `related_query_name` (`company__grant__isnull=False`, `company__clinical_study__isnull=False`) to avoid FieldError.
- **2024-12 Single-Entry Migration**: Solved React preamble errors by implementing dynamic import router in `main.tsx`.
- T-0301 Deals: Deal detail SSR header + Tailwind breadcrumb added; single-entry router wired for `_deal-detail`.
- T-0302 Deals: React Deal Detail page renders summary, industries, signals, decks/papers using axios; loading/error states.
- T-0303 Deals: Added DRF assessments endpoint and React assessment page (FormRenderer + axios). Choices hardcoded (documented); success banner with back-to-detail button.
- **T-0401 Sidebar Redesign**: Complete UI overhaul from top navigation to fixed sidebar layout. New `sidebar_nav.html`, brAINbrAIN branding, `bg-slate-50` background, colorful dashboard metrics. See `docs/sidebar_redesign.md` for full details.
- **T-0402 Reviewed Deals React Component**: Implemented React component for Past Deals (`deals_reviewed.tsx`) following fresh deals pattern. Template migrated to `main.html` layout with green review theme, search functionality, and infinite scroll.

## Server Views (Deals)
- URLs: `brain/apps/deals/urls.py` with names: `dashboard`, `fresh_deals`, `reviewed_deals`, `missed_deals`, `deal_detail`, `deal_update`, `deal_assessment`, `deal_confirm_delete`, `deck_create`, `processing_status`, and `dashboard_data`.
- Templates: shells in `brain/templates/deals/` render mounts like `#deals-dashboard-root` and `#deal-detail-root` for React.

## Deals Assessment (v2 specifics)
- Frontend page: `assets/src/pages/deal_assessment.tsx` (Tailwind UI, FormRenderer + axios) mounted on `body#_deal-assessment`.
- API: `/api/deals/assessments/` upserts a single active assessment per deal (fetch latest by `deal=<uuid>`, create if none, otherwise PATCH), and `/api/deals/deals/{uuid}/` toggles `sent_to_affinity`.
- Choices: Quality percentile options are currently hardcoded client-side to move fast; plan to centralize or serve from the backend later.
- UX: On save, show an inline success banner with a button returning to `/deals/<uuid>/`.

## Single-Entry React Architecture (Implemented 2024)

### Problem Solved
- **Issue**: Multi-entry Vite setup caused `@vitejs/plugin-react can't detect preamble` errors
- **Solution**: Migrated to single-entry pattern with dynamic imports and code splitting

### Current Implementation
1. **Router System**: `main.tsx` detects page via `document.body.id` and loads appropriate modules
2. **Page Detection**: Django templates set `body id="_company-detail"` etc.
3. **Dynamic Loading**: `pageModules` registry uses `import()` for code splitting
4. **React Refresh Fix**: Vite config excludes `/src/pages/*.tsx` from React refresh to prevent preamble errors

### Migration Pattern (For Remaining Pages)
1. **Add to registry**: `'_page-name': () => import('./pages/page_name')` in `main.tsx`
2. **Refactor page module**: Export `initialize()` function instead of self-executing
3. **Update template**: Remove `{% vite_asset 'src/pages/...' %}` from `{% extra_js %}`
4. **Test**: Verify dynamic loading works via console logs

### Trade-offs
- ✅ **Eliminates preamble errors, better performance, cleaner architecture**
- ⚠️ **Lost React Fast Refresh for page modules** (changes need manual refresh)

### Option 2: Restore Fast Refresh (For Complex Pages)
If you need Fast Refresh for interactive components:
1. **Move React logic to**: `src/components/company/CompanyDetailPage.tsx` (gets Fast Refresh)
2. **Keep page module minimal**: `src/pages/company_detail.tsx` only imports and mounts
3. **Pattern**:
   ```typescript
   // pages/company_detail.tsx (minimal)
   import CompanyDetailPage from '../components/company/CompanyDetailPage';
   export function initialize() { 
     mount(<CompanyDetailPage />); 
   }
   ```

### Files Modified
- `main.tsx`: Added router with `pageModules` registry and `initializePage()`
- `company_detail.tsx`: Refactored to export `initialize()` function
- `vite.config.ts`: Added `exclude: [/src\/pages\/.*\.tsx$/]` to React plugin
- `company_detail.html`: Commented out direct `{% vite_asset %}` import
- `tailwind.css`: Added theme customization and optimized `@source` paths

### Critical Runtime Setup
React refresh runtime stubs are required in `main.tsx` even with excluded pages:
```typescript
if (import.meta.env?.DEV) {
    window.$RefreshReg$ = window.$RefreshReg$ || (() => {});
    window.$RefreshSig$ = window.$RefreshSig$ || (() => (type: unknown) => type);
}
```
This prevents `ReferenceError: $RefreshSig$ is not defined` when React components load.

## Navigation Flash Fix (Aug 2025)

### Problem Solved
During React page navigation, users experienced a brief content flash between page load and React mounting. This occurred because:
1. Django template content rendered immediately
2. Brief gap before React components mounted and took over
3. During this gap (~100-200ms), template content was visible, creating a jarring flash

### Solution: Loading Overlay
**File**: `templates/includes/loading_overlay_complete.html`

A loading overlay covers the entire screen during navigation:
- **Immediate appearance**: Inline styles ensure zero delay 
- **React detection**: JavaScript monitors for React component mounting
- **Smooth transition**: Fades out when React takes over
- **Timing critical**: All code is inline to prevent any loading delays

### Architecture Decisions
**Why Everything is Inline**: 
- External CSS files have loading delays that allow flash to appear
- Template includes have microsecond delays that can cause flash
- External JavaScript files load too late to prevent initial flash
- **Lesson**: For timing-critical UX, inline code is sometimes the correct technical solution

### Implementation Details
```html
<!-- All inline: HTML + CSS + JavaScript for perfect timing -->
<div id="app-loading-overlay" style="/* inline styles */">
  <div style="/* spinner styles */"></div>
  <div style="/* text styles */">Loading...</div>
</div>
<style>@keyframes spin { /* inline animation */ }</style>
<script>/* inline React detection and cleanup */</script>
```

**React Detection Logic**:
- Monitors root elements: `deals-dashboard-root`, `deals-fresh-root`, `deal-detail-root`, `du-dashboard-root`
- Checks every 50ms for mounted React components
- Triggers smooth fade-out when React content appears

### Usage
Include in any base template where navigation flash could occur:
```html
{% include 'includes/loading_overlay_complete.html' %}
```

**Result**: Zero navigation flash, smooth professional loading experience.

## Tips
- Use UUID fields for lookups (`slug_field='uuid'` in views, DRF lookups).
- Prefer DRF list/detail for data; minimize server-side context.
- Lint/format: `npm run lint`, `npm run format` (ESLint + Prettier configured in `brain/package.json`).
- **Single-entry pages**: Check console logs for loading confirmation during development.
- **Navigation flash**: Never extract timing-critical code from `loading_overlay_complete.html` - inline is required for perfect timing.
