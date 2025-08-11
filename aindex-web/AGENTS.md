# Legacy UI Guide (aindex-web)

Reference for templates and assets to port into brain. Do not modify this app for v2; use it for mapping only.

## Templates (high value)
- Companies: `templates/companies/*` (detail, grant/patent CRUD)
- Deals: `templates/deals/*` (dashboard, lists, detail, assessment, deck_create, delete)
- Dual-use: `templates/dual_use/*` (dashboard, report CRUD)
- Talents: `templates/talents/*` (replaced by socialgraph in brain)

## Assets
- Webpack entries: `assets/js/{main,company_detail,deal_detail,deals_dashboard,du_dashboard,deck_create}.js`
- SCSS: `assets/scss/*.scss`; output to `assets/dist/{*.js,*.css}`

## URLs (for mapping)
- `apps/deals/urls.py` provides canonical routes for dashboard/data, lists, detail/CRUD.
- `aindexweb/urls.py` shows top-level includes used in legacy.
