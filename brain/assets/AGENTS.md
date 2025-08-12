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
- Body IDs used by router: `_company-detail`, `_deals-dashboard`, `_deal-detail`, `_du-dashboard`.

## Adding a New Page Module
1) Create `src/pages/my_page.tsx` that exports `initialize()` and mounts into a known root element.
2) Add a body id in the Django template (e.g., `<body id="_my-page">`).
3) Register it in `pageModules` within `src/main.tsx`: `'_my-page': () => import('./pages/my_page')`.

## Notes
- Keep modules small; share logic via `src/components` and `src/lib`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
- Company detail uses React islands for the About card and a Library panel; grants/patents remain server-rendered with pagination and “View all” links for now.

## Deals Dashboard (React)
- Module: `src/pages/deals_dashboard.tsx` mounts at `#deals-dashboard-root` on body `#_deals-dashboard`.
- Charts: `react-chartjs-2` + `chart.js`; shared palette in `src/lib/charts.ts`.
- Data: `/deals/dash/data/`; date filters (`date_from`, `date_to`) persisted in the URL via `history.replaceState`.
- Optional: for time-axis tick formatting, add `chartjs-adapter-dayjs-4` and switch x-scale `type: 'time'`.

## Dependencies
- Runtime: `react`, `react-dom`.
- Charts: `chart.js@^4`, `react-chartjs-2@^5` (installed in `brain/package.json`).

## Tailwind CSS (v4)
- Installed: `tailwindcss` and `@tailwindcss/vite` (devDependencies).
- Vite plugin: `tailwindcss()` added in `assets/vite.config.ts`.
- Global CSS: `assets/src/styles/tailwind.css` contains `@import "tailwindcss";` and is imported in `assets/src/main.tsx` so Tailwind is global.
- Template scanning: Tailwind v4 is zero-config; to include server templates outside Vite’s root, `tailwind.css` declares sources:
  - `@source "../templates";`
  - `@source "../apps";`
  This ensures classes used in Django templates are generated without a Tailwind config file.
- Preflight: enabled (default). If conflicting with legacy CSS, consider scoping or disabling selectively.
