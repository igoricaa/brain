# Library App Guide

Purpose: documents library supporting deals and companies (files, papers, authors, sources, categories, document types).

## APIs (DRF)
- Base: `/api/library/`
- Endpoints: `files`, `papers`, `paper-authors`, `sources`, `categories`, `document-types`.
- Read serializers include related company where relevant; use for company detail panels and deal attachments.

## Usage Notes
- Prefer client-side fetches for tables; paginate via DRF parameters (`?page=`, `?page_size=`) and filter via `filters.py` fields.
- Upload flows can remain server-rendered initially; later replace with React and direct uploads to configured storage.
- Company-scoped files: `/api/library/files/?company=<uuid>` supported by `FileFilter.filter_company` (tags convention + DealFile→Deal→Company), used by the Company Detail Library panel.
