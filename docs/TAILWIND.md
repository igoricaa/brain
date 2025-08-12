# Tailwind CSS v4 Integration (brain)

This document summarizes how Tailwind CSS v4 is integrated into the `brain` app and how to use it across Django templates and React islands.

## Overview
- Stack: Tailwind CSS v4 + Vite 7 + React 19 + `django_vite`.
- Scope: Tailwind is globally available on all pages (server-rendered templates and React entries).
- Preflight: Enabled (default).

## What Changed
- Added dev deps: `tailwindcss` and `@tailwindcss/vite` in `brain/package.json`.
- Switched `brain/package.json` to ESM: added `"type": "module"` for compatibility with the Tailwind Vite plugin.
- Wired plugin: added `tailwindcss()` to `plugins` in `brain/assets/vite.config.ts`.
- Global CSS: created `brain/assets/src/styles/tailwind.css` and imported it in `brain/assets/src/main.tsx` so Tailwind loads everywhere.
- Template scanning: added `@source` directives in CSS to include Django templates (v4 is zero-config — no tailwind.config file).
- Verified: production build via Vite succeeds; `django_vite` serves the hashed assets.

## Files Touched
- `brain/package.json`
  - Added: `tailwindcss`, `@tailwindcss/vite` (devDependencies)
  - Added: `"type": "module"`
- `brain/assets/vite.config.ts`
  - Added: `import tailwindcss from '@tailwindcss/vite'`
  - Plugins: `[react(), tailwindcss()]`
- `brain/assets/src/styles/tailwind.css`
  - Contents:
    ```css
    @import "tailwindcss";
    @source "../templates";
    @source "../apps";
    ```
- `brain/assets/src/main.tsx`
  - Added: `import './styles/tailwind.css'`
- `brain/assets/AGENTS.md`
  - Documented django_vite usage and Tailwind v4 notes (no config file; using `@source`).

## Django Integration
- Base template (`brain/templates/base.html`) includes `django_vite` tags:
  ```django
  {% load django_vite %}
  {% vite_hmr_client %}
  {% vite_asset 'src/main.tsx' %}
  ```
- This ensures the global Tailwind CSS is loaded on every page.

## Usage
- Django templates in `brain/templates/**` and `brain/apps/**/templates/**` can use Tailwind classes directly:
  ```html
  <div class="p-6 bg-zinc-50 rounded-xl">Hello</div>
  ```
- React pages/islands under `brain/assets/src` are covered globally through the `main.tsx` import — no per-entry Tailwind import needed.

## Development & Build
- Dev: `cd brain && npm install && npm run dev` (HMR via `{% vite_hmr_client %}` in base template)
- Build: `cd brain && npm run build` (emits to `brain/assets/dist` with manifest; served by `django_vite`)

## Preflight Notes
- Preflight is ON by default, providing a small reset and sensible defaults (typography, forms).
- Watch for subtle changes on legacy pages (headings/lists margins, tables, form controls). If needed, we can scope or adjust.

## Template Scanning (Tailwind v4)
- Tailwind v4 no longer uses `tailwind.config.*` for content globs.
- The Vite plugin scans the dependency graph and any extra paths declared with `@source` in CSS.
- We added:
  ```css
  @source "../templates";
  @source "../apps";
  ```
  to pick up classes used in Django templates outside the Vite root.
- To narrow scope, replace `@source "../apps";` with specific app template paths (e.g., `../apps/companies/templates`).

## Troubleshooting
- If builds fail with an ESM error for `@tailwindcss/vite`, ensure `"type": "module"` exists in `brain/package.json`.
- If classes from templates don’t appear, confirm the template path is reachable via the `@source` directives and the dev server/build has run.

## Next Steps (Optional)
- Add `@apply` patterns for shared utility compositions if desired.
- Introduce design tokens via CSS variables and reference via `theme(--var)` in v4 functions.
- Narrow `@source` scope to specific template directories for performance if needed.

## Single-Entry React Architecture (Implemented)
- **Problem**: Multi-entry Vite setup caused `@vitejs/plugin-react can't detect preamble` errors for secondary entries like `company_detail.tsx`
- **Solution**: Migrated to single-entry pattern where `main.tsx` acts as a router that dynamically imports page modules

### Changes Made:
1. **main.tsx Router**: Added page detection system using `document.body.id` to conditionally load page modules:
   ```typescript
   const pageModules = {
     '_company-detail': () => import('./pages/company_detail'),
   };
   ```

2. **company_detail.tsx**: Refactored from self-executing to export pattern:
   ```typescript
   export function initialize() {
     // Mount React components
   }
   ```

3. **Django Templates**: Removed page-specific Vite assets from `{% extra_js %}` blocks:
   ```django
   {# Migrated to single-entry pattern - main.tsx handles loading #}
   {# {% vite_asset 'src/pages/company_detail.tsx' %} #}
   ```

4. **Theme Customization**: Added 5-line theme in `tailwind.css`:
   ```css
   @theme {
     --color-primary-500: oklch(0.7 0.2 250);
     --font-display: 'Inter', sans-serif;
     --spacing-18: 4.5rem;
     --radius-xl: 1rem;
   }
   ```

5. **Optimized Template Scanning**: Specific app paths instead of broad `../apps`:
   ```css
   @source "../../../apps/companies/templates";
   @source "../../../apps/deals/templates";
   @source "../../../apps/library/templates";
   ```

### Benefits:
- ✅ Eliminates React preamble errors
- ✅ Code splitting with dynamic imports
- ✅ Single React initialization point
- ✅ Better performance through shared chunks
- ✅ Maintains backwards compatibility during migration

### Migration Pattern for Other Pages:
1. Add page entry to `pageModules` in `main.tsx`
2. Export `initialize()` function from page module
3. Remove `{% vite_asset %}` from Django template
4. Test and verify

### Legacy Support:
Pages still self-execute in dev mode when `window.__SINGLE_ENTRY_MODE__` is not set, allowing gradual migration.

## Verification Notes
- Tailwind demo banner: Remove `{% include 'includes/tw_demo_banner.html' %}` after verifying styles load
- Known unrelated 404: If `{% static 'images/logo.svg' %}` 404s in nav, update the asset path
