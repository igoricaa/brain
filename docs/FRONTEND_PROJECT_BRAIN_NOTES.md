# Frontend Project — brAIN (Summary and Plan)

This document summarizes the latest project scope, constraints, and actionable plan based on the shared PRD and goals.

## Scope Summary
- Purpose: Underwriting/investing app evaluating startups via deck ingestion, external data, and AI assessments.
- 2024–2025 Upgrades:
  - File management for multiple files per deal and general-purpose library files (RAG searchable).
  - Research agent that seeks and analyzes academic research; returns JSON stored in the model.
  - Data model upgrades and stronger AI privacy protections; monorepo rename to “brain”.
- Deadline: Initial version of Knowledge Base + Research Agent by Aug 15. Follow-up fixes and testing thereafter.
- Stack: Django + Celery + Postgres; deployed on GCP (single VM + Cloud SQL).

## Frontend Tasks
1) File Management
- Reusable component used across:
  - Library mode (general file management)
  - Deal mode (curation + “Submit for Underwriting”)
  - New deals and existing deals flows
- Features:
  - Upload multiple files; associate with a deal or keep in library
  - Edit metadata (type, domain, proprietary flag, published_at)
  - Tag and bulk ops (delete, tag_for_deal, update_metadata)
  - TL;DR + clean_text extraction and processing status
- API Spec (abridged per PRD):
  - GET /files/ (filters: deal_id, search, type, domain, source, proprietary_data, ordering)
  - GET /files/{id}/
  - POST /files/ (multipart, duplicate handling)
  - PATCH /files/{id}/ (metadata update)
  - POST /files/bulk/ (delete, tag_for_deal, update_metadata)
  - POST /deals/{deal_id}/submit/ (kick off underwriting run)
  - GET /config/document-types/ and GET /config/domains/

2) Research Agent UI
- Primary: Final technical and team assessments (Markdown with citations → links to papers)
- Secondary (expandable):
  - Search strings and counts per citation level
  - List of examined papers with short assessment + link
  - Team members list with short assessment per person
- Data comes from a stored JSON payload after agent run

3) General Reskin
- Light, clean theme (spacing, typography, table styling) without major IA changes
- Reusable, consistent table component
- Optional neural-circuitry accents for brand alignment

## Design + Implementation Notes
- UI System: shadcn/ui + Tailwind v4; match deals/fresh + company detail styling
- Deal Detail Redesign: implemented AI + Analyst assessments and removed top-right actions
- Reusable File Manager props (proposal):
  - `mode: 'library' | 'deal' | 'new-deal'`
  - `dealId?: string`
  - `showUpload?: boolean`
  - `allowSubmission?: boolean` (shows “Submit for Underwriting” in deal mode)
- Processing strategy: prefer on-submit (per PRD) or on-upload (configurable) — consistent status display; exponential backoff polling
- Duplicate files: implement content hash detection

## Phased Plan (Aug 15 target)
- Phase A (Today → Aug 13):
  - File Manager MVP (Library + Deal modes): upload, list/search/filter, inline metadata edit, bulk ops, URL state, optimistic updates
  - Backend endpoints (DRF viewsets + filters) as per PRD; duplicate handling; pagination
  - Submit for Underwriting endpoint: trigger Celery task group and return run id
- Phase B (Aug 14 → Aug 15):
  - Research Agent UI: markdown render w/ citations; expandable details; link to papers
  - Finalize reskin on main pages: tables, spacing, typography
- Phase C (Post-Aug 15):
  - Robust validation + async rules; improved duplicate UX
  - Advanced filtering; saved views; export
  - Diff/compare across multiple underwriting runs

## Dev Utilities
- `python manage.py create_dummy_deal`: seeds a complete deal with assessment and example files
- `python manage.py import_figma_deal <json>`: import a deal from Figma-style JSON

## Open Questions
- Confirm exact File entity model and category taxonomies (types/domains) vs. current `library.File`/`DealFile`
- Confirm duplicate detection policy (strict hash vs. filename + size heuristic)
- Confirm underwriting submission options (force_reprocess, include_proprietary defaults)

