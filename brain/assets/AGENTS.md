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
- Base: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}`.
- Page entries: `{% block extra_js %}{% vite_asset 'src/pages/<entry>.tsx' %}{% endblock %}`.

## Adding a New Page Entry
1) Create `src/pages/my_page.tsx` and export a mount function that reads a data attribute and renders via `createRoot`.
2) Add it to `rollupOptions.input` in `vite.config.ts`.
3) In the template, `{% load django_vite %}{% vite_entry 'src/pages/my_page.tsx' %}` and add a mount `<div id="my-page-root" data-...>`.

## Notes
- Keep entries small; share logic via `src/components` and `src/services`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
- Company detail uses React islands for the About card and a Library panel; grants/patents remain server-rendered with pagination and “View all” links for now.

## Tailwind CSS (v4)
- Installed: `tailwindcss` and `@tailwindcss/vite` (devDependencies).
- Vite plugin: `tailwindcss()` added in `assets/vite.config.ts`.
- Global CSS: `assets/src/styles/tailwind.css` contains `@import "tailwindcss";` and is imported in `assets/src/main.tsx` so Tailwind is global.
- Template scanning: Tailwind v4 is zero-config; to include server templates outside Vite’s root, `tailwind.css` declares sources:
  - `@source "../templates";`
  - `@source "../apps";`
  This ensures classes used in Django templates are generated without a Tailwind config file.
- Preflight: enabled (default). If conflicting with legacy CSS, consider scoping or disabling selectively.
