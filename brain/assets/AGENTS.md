# Frontend Assets Guide (Vite + React)

This folder hosts the hybrid frontend for brain using React 19 and Vite 7.1.1.

## Layout

- `vite.config.ts`: base `/static/`, `build.outDir='assets/dist'`, `manifest=true`.
- `src/main.tsx`: single global entry that dynamically imports page modules by `document.body.id`.
- `src/pages/*`: page modules exporting `initialize()` (e.g., `company_detail.tsx`, `deals_dashboard.tsx`).
- `src/lib/*`: shared helpers (e.g., `lib/charts.ts` registers Chart.js + legacy palette).
- `tsconfig.json`: TS settings for Vite React.

## Commands (from brain/)

- `npm run dev`: Vite dev server (HMR) at 5173.
- `npm run build`: production build to `assets/dist` with `manifest.json`.
- `npm run lint` / `npm run format`: ESLint + Prettier.

## Django Integration

- Base: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}` only. Page code is lazy-loaded by `main.tsx`.
- Body IDs used by router: `_company-detail`, `_grant-create`, `_deals-dashboard`, `_deal-detail`, `_du-dashboard`.

## Adding a New Page Module

1. Create `src/pages/my_page.tsx` that exports `initialize()` and mounts into a known root element.
2. Add a body id in the Django template (e.g., `<body id="_my-page">`).
3. Register it in `pageModules` within `src/main.tsx`: `'_my-page': () => import('./pages/my_page')`.

## Notes

- Keep modules small; share logic via `src/components` and `src/lib`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
- React Forms: Use the shared FormRenderer (react-hook-form + zod) with API submission via TanStack Query + Axios. See below.

## Deals Dashboard (React)

- Module: `src/pages/deals_dashboard.tsx` mounts at `#deals-dashboard-root` on body `#_deals-dashboard`.
- Charts: `react-chartjs-2` + `chart.js`; shared palette in `src/lib/charts.ts`.
- Data: `/deals/dash/data/`; date filters (`date_from`, `date_to`) persisted in the URL via `history.replaceState`.
- Optional: for time-axis tick formatting, add `chartjs-adapter-dayjs-4` and switch x-scale `type: 'time'`.

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
