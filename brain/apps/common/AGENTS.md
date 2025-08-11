# Common App Guide

Helpers shared across apps.

## Template Tags
- `apps/common/templatetags/brain.py`
  - Filters: `intword_usd` (formats currency as K/M with $), `url_display` (domain + path from URL).
- `brain/templatetags/vite.py`
  - Tag: `{% vite_entry 'src/<entry>.tsx' %}`
  - DEBUG: injects Vite dev client and module script from http://localhost:5173.
  - PROD: resolves hashed files and CSS via `assets/dist/manifest.json`.

## Usage
- Load with `{% load brain %}` or `{% load vite %}` at the top of templates.
