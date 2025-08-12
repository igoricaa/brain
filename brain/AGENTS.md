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

## UI Conventions (Companies)
- Company detail grants/patents panels are paginated server-side with a “View all” toggle.
- Query params: Grants `g_page/g_size/g_all`, Patents `p_page/p_size/p_all` (default page size = 5).
- CRUD flows include a `next` param and redirect back to the same paginated view after actions; patent bulk delete uses a single POST form with checkboxes named `patent_applications`.

## Useful Paths
- Companies templates/views: `brain/apps/companies/views/*`, `brain/apps/companies/urls.py`, templates under `brain/templates/companies/`.
- Deals/Dual-use/Library: API implemented, server views/urls to add as needed (see app guides).
- Template tags: `apps/common/templatetags/brain.py` (filters: `intword_usd`, `url_display`). Use `django_vite` tag library for assets.

## Recent Changes (compact)
- T-0102 Companies: About card moved to React island (`#company-about-root`) via single-entry router; removed server duplication.
- T-0104 Library: Company-scoped Library panel island (`#company-library-root`) with source filter + pagination; backend filter `?company=<uuid>` added.
- T-0201 Deals: Added server URLs and thin views; included under `path('deals/', ...)` in project `urls.py`.
- T-0202 Deals: Ported shell templates with React mounts (dashboard, lists, detail, assessment, delete, deck create).
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
