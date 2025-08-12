# Companies App Guide

Purpose: companies domain and related people. Provides API and some server views. Use as the primary source for company detail and CRUD on grants/patents.

## Models (high level)
- `Company`: rich profile (hq fields, industries, funding, IPO, web metrics). Primary key `id`; public `uuid`.
- People: `Founder`, `Advisor` (extend `socialgraph.Profile`); relations via `Founding`, `CompanyAdvisor`.
- Artifacts: `Grant`, `PatentApplication`, `ClinicalStudy`.

## APIs (DRF)
- Base: `/api/companies/`
- Endpoints: `companies`, `founders`, `advisors`, `grants`, `clinical-studies`, `patent-applications`.
- Lookups: by `uuid`; serializers include related minimal objects for lists.
- Create/Update (policy): forms in v2 submit to API endpoints using Axios (session auth via CSRF) with TanStack Query. Server-side views remain for route and permission checks, but React islands handle the UX.

## Server Views & Templates
- Detail: `CompanyDetailView` → `templates/companies/company_detail.html` (slug by `uuid`).
- Grant CRUD: `GrantCreate/Update/DeleteView` → `templates/companies/grant_*.html`.
- Patent CRUD: `PatentApplication*View` → `templates/companies/patent_application_*.html`.
- URLs: `brain/apps/companies/urls.py`.

## Company Detail Pagination & CRUD UX
- Grants pagination: server-rendered with simple controls and a “View all” toggle.
  - Query params: `g_page`, `g_size`, `g_all` (default size = 5; `g_all=1` shows full list).
  - Context keys: `grants_page`, `grants_list`, `grants_total`, `g_size`.
  - Template shows “Showing X–Y of Z” with Prev/Next; links preserve other section params.
- Patent Applications pagination: mirrors Grants implementation.
  - Query params: `p_page`, `p_size`, `p_all` (default size = 5; `p_all=1` shows full list).
  - Context keys: `patents_page`, `patent_applications`, `patents_total`, `p_size`.
- Redirect preservation: create/update/delete links and forms include `next={{ request.get_full_path }}`; delete confirm templates include hidden `next` input so actions return to the same paginated view.
- Patent bulk delete: implemented as a single server-side POST form wrapping the list.
  - Checkboxes: `name="patent_applications"` (multiple values submitted).
  - Bulk delete action consumes the list and redirects back using `next` when present.
- Performance: `CompanyDetailView` prefetches grants; lists are paginated in view logic.

## Frontend Hooks
- Single entry: `base.html` includes only `src/main.tsx`. Page modules lazy-load by `body id`.
- React islands:
  - About card [done]: `<div id="company-about-root" data-uuid="{{ company.uuid }}"></div>` fetches `/api/companies/companies/{uuid}/`.
  - Library panel [done]: `<div id="company-library-root" data-uuid="{{ company.uuid }}"></div>` fetches `/api/library/files/?company={{ uuid }}`.
  - Grant create [new]: `grant_create.html` sets `{% block body_id %}_grant-create{% endblock %}` and includes:
    ```html
    <div id="grant-form-root"
         data-api-endpoint="/companies/grants/"
         data-company="{{ company.uuid }}"
         data-csrf="{{ csrf_token }}"
         data-fields='[{"name":"name","label":"Name","type":"text","required":true}]'
         data-initial='{}'
         data-cancel="{{ request.GET.next|default:'/' }}"></div>
    ```
    The page module mounts `FormRenderer` (react-hook-form + zod) inside `QueryClientProvider` and posts to API via Axios.

## Adaptation Checklist (Phase 1)
- Port any missing blocks/partials from `aindex-web/templates/companies/*` to `brain/templates/companies/*`.
- Ensure base layout parity (nav, messages) with `brain/templates/base.html`.
- Confirm forms work; align field names with current models.
- Done: core templates ported; page Vite entry wired; About + Library islands mounted; grants/patents server pagination and redirects complete.

## React Migration (Phase 2) - COMPLETED ✅
- ✅ Added `company_detail` entry; components mounted into `#company-detail-root` and sub-roots per panel.
- ✅ Enhanced React islands with modern shadcn/ui components and responsive design.
- ✅ Maintained server-rendered pagination while modernizing UI components.
- ✅ Used `uuid` from template context via `data-uuid` attributes for initial fetch.

## Company Detail Page Redesign (T-0402) - COMPLETED ✅

### Template Migration
- **Layout Change**: Migrated from `companies/base.html` to `main.html` for consistent sidebar navigation
- **Modern Header**: Added page title, subtitle with location/founded info, company logo, and action buttons
- **Metric Cards**: Implemented 4-column responsive grid with funding metrics:
  - Total Funding (green icon) - shows total amount and number of rounds
  - Last Funding (blue icon) - shows amount, type, and date
  - Valuation (purple icon) - shows range and date
  - Stage (orange icon) - shows current funding stage

### React Component Enhancements
- **CompanyAbout**: Redesigned with modern grid layout, proper typography, external link icons
- **CompanyLibraryPanel**: Enhanced with document filtering, modern pagination controls, and file icons
- **shadcn/ui Integration**: Added Avatar, Separator, Progress, Alert, and Tabs components
- **Responsive Design**: All grids adapt from mobile (1 column) to desktop (2-4 columns)

### Design System Implementation
- **Card Pattern**: Consistent `rounded-lg bg-white p-6 shadow-sm border border-gray-200` throughout
- **Icon System**: Lucide React icons (Building, FileText, ExternalLink, Filter) with consistent sizing
- **Color Scheme**: Colorful metric card icons, muted text hierarchy (`text-gray-900`, `text-gray-500`)
- **Typography**: Modern heading scale (`text-2xl`, `text-lg`) with proper font weights

### Dependencies Added
- `@radix-ui/react-avatar@^1.1.10`
- `@radix-ui/react-separator@^1.1.7`
- `@radix-ui/react-progress@^1.1.7`
- `@radix-ui/react-tabs@^1.1.12`

### File Structure
```
brain/
├── templates/companies/company_detail.html    # Redesigned template with metric cards
├── assets/src/
│   ├── components/ui/
│   │   ├── avatar.tsx                         # New shadcn/ui component
│   │   ├── separator.tsx                      # New shadcn/ui component
│   │   ├── progress.tsx                       # New shadcn/ui component
│   │   ├── alert.tsx                          # New shadcn/ui component
│   │   └── tabs.tsx                           # New shadcn/ui component
│   └── pages/company_detail.tsx               # Enhanced React components
```

### Accessibility & Performance
- **ARIA Labels**: Proper semantic HTML with role attributes
- **Keyboard Navigation**: Tab-friendly interactive elements
- **Loading States**: Skeleton loading and error handling
- **Build Size**: Maintained efficient bundle size (10.94 kB gzipped)
- **Mobile Responsive**: Adapts gracefully from mobile to desktop
