# Dual Use App Guide

Purpose: dual-use reports and signals UI. In brain, DU signals are surfaced via deals API; the legacy app has server pages.

## Models
- See `aindex-web/apps/dual_use/models.py` (reference). In brain, DU taxonomy lives under deals (`DualUseSignal/Category`).

## APIs
- Use `/api/deals/du-signals` for taxonomy and counts in dashboards.

## Server Views & Templates (to add)
- URLs (new): `brain/apps/dual_use/urls.py` for dashboard and report CRUD routes.
- Templates to port to `brain/templates/dual_use/`: `base.html`, `dashboard.html`, `report_list.html`, `report_detail.html`, `report_create.html`, `report_update.html`, `report_delete.html`, `unreviewed_report_list.html`.

## Adaptation Checklist
- Start with dashboard and list pages; back charts with aggregated JSON views or direct API filters.
- Ensure filters/orderings match legacy expectations where possible.

## React Migration
- `du_dashboard` entry rendering charts and tables; reuse chart color palettes from legacy.
