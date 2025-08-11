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

## Server Views & Templates
- Detail: `CompanyDetailView` → `templates/companies/company_detail.html` (slug by `uuid`).
- Grant CRUD: `GrantCreate/Update/DeleteView` → `templates/companies/grant_*.html`.
- Patent CRUD: `PatentApplication*View` → `templates/companies/patent_application_*.html`.
- URLs: `brain/apps/companies/urls.py`.

## Frontend Hooks
- Page-specific Vite entry loaded in template:
  - In `company_detail.html`: `{% block extra_js %}{% load vite %}{% vite_entry 'src/pages/company_detail.tsx' %}{% endblock %}`
  - React mount: `<div id="company-detail-root" data-uuid="{{ company.uuid }}"></div>`
- Current component: About card renders website, HQ, founded, summary by fetching `/api/companies/companies/{uuid}/`.
- Next targets: founders/advisors lists; patents/grants tables; charts.

## Adaptation Checklist (Phase 1)
- Port any missing blocks/partials from `aindex-web/templates/companies/*` to `brain/templates/companies/*`.
- Ensure base layout parity (nav, messages) with `brain/templates/base.html`.
- Confirm forms work; align field names with current models.
- Done: core templates ported; page-specific Vite entry wired; initial React widget mounted.

## React Migration (Phase 2)
- Add `company_detail` entry; mount components into `#company-detail-root` and sub-roots per panel.
- Replace server-rendered tables with API-driven React tables; paginate via DRF params.
- Use `uuid` from template context via `data-uuid` attributes for initial fetch.
