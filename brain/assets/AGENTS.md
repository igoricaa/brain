# Frontend Assets Guide (Vite + React)

This folder hosts the hybrid frontend for brain using React 19 and Vite 7.1.1.

## Layout
- `vite.config.ts`: base `/static/`, `build.outDir='assets/dist'`, `manifest=true`, multiple inputs.
- `src/main.tsx`: global entry for base template.
- `src/pages/*`: page-specific entries (e.g., `company_detail.tsx`).
- `tsconfig.json`: TS settings for Vite React.

## Commands (from brain/)
- `npm run dev`: Vite dev server (HMR) at 5173.
- `npm run build`: production build to `assets/dist` with `manifest.json`.
- `npm run lint` / `npm run format`: ESLint + Prettier.

## Django Integration
- Base template: `{% load vite %}{% vite_entry 'src/main.tsx' %}`.
- Page-specific entries: inside a template block (e.g., `{% block extra_js %}{% vite_entry 'src/pages/company_detail.tsx' %}{% endblock %}`).
- Asset loader: `brain/templatetags/vite.py` (injects dev client in DEBUG; resolves manifest in PROD).

## Adding a New Page Entry
1) Create `src/pages/my_page.tsx` and export a mount function that reads a data attribute and renders via `createRoot`.
2) Add it to `rollupOptions.input` in `vite.config.ts`.
3) In the target template, include `{% vite_entry 'src/pages/my_page.tsx' %}` and add a mount `<div id="my-page-root" data-...>`.

## Notes
- Keep entries small; share logic via `src/components` and `src/services`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
