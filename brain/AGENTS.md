# Brain v2 Guide

This is the v2 Django project and API. Frontend moves here using a hybrid Django + Vite/React approach now, evolving to a standalone SPA later.

## Layout & Settings
- Project: `brain/brain/{settings.py,urls.py,api_urls.py}`; `INSTALLED_APPS` includes `companies`, `deals`, `dual_use`, `library`, `locations`, `socialgraph`, `users`, `common`.
- Templates: `brain/templates` (extends `base.html`, `main.html`).
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

### React Forms Standard (2025)
- We are standardizing on React forms across v2 to avoid server-side widget styling and to enable a smooth migration to a full SPA later.
- Form engine: `react-hook-form` + `@hookform/resolvers` + `zod` (v4) for schema validation.
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
    data-fields='[{"name":"name","label":"Name","type":"text","required":true}]'
    data-initial='{}'
    data-cancel="{{ request.GET.next|default:'/' }}"
  ></div>
  ```
- The page must set a `body id`, e.g. `{% block body_id %}_grant-create{% endblock %}`, to trigger lazy-loading.
- Cancel navigation: use the `?next=` query param whenever linking to create/update pages to guarantee a good return URL.

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

## Server Views (Deals)
- URLs: `brain/apps/deals/urls.py` with names: `dashboard`, `fresh_deals`, `reviewed_deals`, `missed_deals`, `deal_detail`, `deal_update`, `deal_assessment`, `deal_confirm_delete`, `deck_create`, `processing_status`, and `dashboard_data`.
- Templates: shells in `brain/templates/deals/` render mounts like `#deals-dashboard-root` and `#deal-detail-root` for React.

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

## Tips
- Use UUID fields for lookups (`slug_field='uuid'` in views, DRF lookups).
- Prefer DRF list/detail for data; minimize server-side context.
- Lint/format: `npm run lint`, `npm run format` (ESLint + Prettier configured in `brain/package.json`).
- **Single-entry pages**: Check console logs for loading confirmation during development.
