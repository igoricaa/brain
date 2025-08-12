# Common App Guide

Helpers shared across apps.

## Template Tags
- `apps/common/templatetags/brain.py`
  - Filters: `intword_usd` (USD compact K/M), `url_display` (domain + path from URL).
- Assets: use the `django_vite` library in templates.
  - `{% load django_vite %}{% vite_entry 'src/<entry>.tsx' %}`

## Usage
- Load with `{% load brain %}` for filters, `{% load django_vite %}` for assets.
