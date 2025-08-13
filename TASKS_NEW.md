**Deal Upload, Management, Assessment — End‑to‑End Plan**

- **Scope:** Implement draft → upload → process → enrich → research → assess → send/activate → reassess → archive across Brain (backend APIs + React UI). Align with PRD and transcript. Avoid gzip on client; upload files individually with soft limits. Unify Deals list with status tabs and server search. Redesign Deal Detail with stacked AI vs Analyst, file manager modal, actions bar. Add library file manager link.
- **Assumptions:** Postgres + Redis/RQ/Celery available; Affinity and Coresignal creds present in env; document index/knowledge graph ready via `library` app; OCR pipeline callable server‑side; tokenization available via `tokenizers` or fallback char/4.

**Backend — Models & Migrations**
- **DealStatus: add `archived`:** Update `brain/apps/deals/models/base.py` to include `ARCHIVED = 'archived'`; add migration; update usages and choices validation.
- **DraftDeal lifecycle:** Confirm `Deal.is_draft` + `DraftDeal` proxy is correct; ensure constraints allow missing `company` only if `is_draft=True` (already enforced). Add `finalized_at` datetime on Deal when draft → deal (optional, helps analytics).
- **DealFile provenance:** Ensure `DealFile` has fields `source` (enum: upload, affinity, library), `affinity_file_id` (nullable), and `soft_deleted` boolean. Add `ingested_at`, `cleaned_text` TextField, `tokens_estimate` int. Migration with defaults; backfill nulls.
- **Assessment tracking:** Verify `DealAssessment` includes AI auto_* fields (present). Add fields for longitudinal diff: `based_on_assessment` FK (nullable) and `new_files_json` JSONField (list of file UUIDs since last). Add `sent_to_affinity_at` dt on assessment.
- **ResearchAgent storage:** In `apps/research` or `deals`, add model(s): `ResearchAnalysis` with `deal` FK, `final_assessment_md`, `team_assessment_md`, `search_queries` (array), and per‑query components table if not present. If a similar model exists, extend with `updated_from_files` many‑to‑many to DealFile.

**Backend — APIs**
- **Draft Deals API:** Confirm `POST /api/deals/drafts/` creates minimal draft (name optional). Add `POST /api/deals/drafts/{uuid}/finalize/` (exists) to produce non‑draft deal; ensure returns DealReadSerializer with URL.
- **File Upload APIs:**
  - `POST /api/deals/decks/` exists; extend to accept `deal` that may be a draft UUID (Deal.all_objects). Return created `deal_uuid` regardless. Enforce mimetype/extension = pdf only (present).
  - `POST /api/deals/files/` and `/api/deals/papers/` support multipart for individual files. Validate per‑file size soft limit via Django setting and return 413/400 with friendly message.
  - Add `GET /api/deals/files/new-since-assessment/?deal=<uuid>` to list files created or updated after latest assessment, grouped by type; include `is_new_since_last` flag on file list endpoints when `deal` param present.
- **Deals list/search/status:**
  - Extend `DealFilter` to include `status` (already) and `q` (already). Add `status=archived` support. Consider `all=true` to return all statuses; otherwise filter default by `new`.
  - Add counts endpoint: `/api/deals/summary/?status=<...>` returning totals per status, and per external signal counts (founders, grants, patents, clinical trials) for list badges.
- **Assessment endpoints:**
  - Confirm `GET/POST /api/deals/assessments/?deal=<uuid>` using write serializer. On create, set `based_on_assessment` = latest existing assessment if present; compute and store `new_files_json` via server diff.
  - Add `POST /api/deals/assessments/{uuid}/send-to-affinity/` that posts once; if success, mark `deal.status=new→active` and set `assessment.sent_to_affinity_at`.
- **Reassessment trigger:** `POST /api/deals/deals/{uuid}/reassess/` to enqueue pipeline (see Processing). Should skip re‑processing existing files; decide whether to enqueue research agent based on presence of new academic/whitepapers since last assessment.
- **Archive/Delete actions:**
  - `POST /api/deals/deals/{uuid}/archive/` sets `status=archived` (idempotent).
  - `DELETE /api/deals/deals/{uuid}/` regular delete (already).
  - No bulk endpoints; front‑end sends N individual requests.
- **Research Agent API:**
  - `GET /api/research/analyses/?deal=<uuid>` list latest, with `final_assessment_md`, `team_assessment_md`, top chunks per search query; `POST /api/research/analyses/run/` to run agent for a deal.
- **Knowledge Graph search for RAG:** `GET /api/library/chunk-search/?deal=<uuid>&q=<query>&top_k=...&min_score=...` if not already exposed; otherwise reuse existing vector search.

**Backend — Processing Pipelines**
- **OCR & cleaning:** On new DealFile (Deck, Paper, File):
  - OCR each file; store raw extracted text.
  - Cleaning rules: pitch decks and any file >5k tokens (except academic/whitepapers) → run “clean faithfully, reduce tokens” prompt; other files → summary prompt. Save `cleaned_text`, `tokens_estimate`.
  - Extract company facts (name, domain, founders) and dual‑use signals from cleaned pitch deck; update Deal/Company fields cautiously (don’t overwrite non‑null manual edits without flags).
- **Indexing:** Index cleaned or raw text into document index / knowledge graph with file metadata; attach to company/deal nodes.
- **Affinity enrichment:** Using company domain, attempt to resolve Affinity organization/ID; then ingest:
  - Files: fetch and add as DealFiles with `source=affinity`, set `affinity_file_id`; don’t de‑dupe beyond ID check; respect `soft_deleted` (don’t re‑add over soft‑deleted).
  - Notes: fetch via notes API; ingest notes not authored by AINdex/Brain (regex marker); ignore duplicates. Re‑run standard file processing on downloaded files.
- **Advisor profiles:** Extend enrichment to include advisors from Coresignal, paralleling founders.
- **Research agent run:** After enrichment completes and deck text exists, run RA with inputs: cleaned deck text, founder/advisor profiles, and academic papers. Persist outputs.
- **Assessment pipeline:**
  - Build dynamic context using priority list (previous assessment deltas first, then cleaned deck, Affinity notes, RA outputs, founders, grants, patents, clinical studies, other cleaned files) respecting hard cap 50k tokens.
  - Compute pre‑RAG length; set `rag_budget = min(50k - context, 10k)`; if budget >= ~2k, run vector search using 3 RA queries (from `ResearchAnalysis.search_queries`), merge results by score and trim to budget; skip if budget exhausted.
  - Submit final prompt with context + RAG + instructions appended last; parse JSON; map to fields on `DealAssessment` (manual fields) and `auto_*` where appropriate; do not compute composite score in LLM.
  - Never re‑process files unchanged since last assessment; reuse cached cleaned texts and embeddings.

**Frontend — Global/Navigation**
- **Nav updates:**
  - Replace Fresh/Past menu with single `Deals` linking to unified list; add `+ New Deal` and `Knowledge Graph` (library) links. Point to `deals:dashboard` or new unified template.
  - Update `brain/templates/includes/sidebar_nav.html` accordingly.
- **Vite entries:** Ensure entries for `src/pages/deals_list.tsx` (new unified), `deal_detail.tsx` (exists), `deal_upload.tsx` (exists), `research_agent.tsx` (exists). Verify `{% vite_asset %}` includes on pages.

**Frontend — Deals List (Unified)**
- **Single page with tabs:** React page `src/pages/deals_list.tsx` with status tabs: New, Active, Archived, All.
- **Server search:** Text input debounced 300ms calling `/api/deals/deals/?status=<>&q=<>`.
- **Columns:** Company (links to latest assessment detail), Age, Fundraise, Status (“Active (Nx run)”), Industries tags, Dual‑use signals tags, External signals badges (n founders, n grants, n patent apps; hide 0s).
- **Pagination:** Server‑side (cursor or page) with infinite scroll or standard pagination.
- **Bulk UI hooks (optional):** Checkbox selection; actions (archive, delete) operate by sending N individual requests.
- **Acceptance:** Status tabs filter; search narrows correctly; clicking row opens deal detail.

**Frontend — Deal Detail Redesign**
- **Sectioning:**
  - Basic deal data: compact header card (already SSR); keep company, website, status, funding stage, created date.
  - External data: Founders, Grants, Clinical Trials, Patent Applications panels; show counts in headers and expand triangle. Only auto‑expand if count > 0. Add “+ Add Founder” and “+ Add Patent Application” buttons.
  - Research agent summary: two large markdown displays (tech assessment and team summary) with “Open Research Agent” link.
  - Mini Memo: stack AI Assessment (read‑only) above Analyst Assessment (inline editable); align fields by row: Rationale, Pros, Cons; analyst entries as open text fields (no edit toggle). Add AI and Analyst recommendation dropdowns side by side; map recommendation ↔ quality percentile.
- **Actions bar (bottom anchored):** Buttons: Send to Affinity (disabled if already sent), Reassess, Edit Files (opens modal), Refresh Data, Underwriting History, Archive, Delete. Persistently visible.
- **“New since last assessment”:** In file modal and RA context sidepanel, flag files added since latest assessment.
- **Acceptance:** Edit fields persist via `/api/deals/assessments/`; send‑to‑affinity transitions `new→active` and disables; archive moves to Archived tab.

**Frontend — Deal Creation & Drafts**
- **Draft flow:**
  - On opening New Deal, immediately `POST /api/deals/drafts/` to get `draft_uuid`; cache in IndexedDB with a local temp ID; sync mapping.
  - Upload files individually (one by one) referencing `deal=<draft_uuid>` to `/api/deals/decks|papers|files/` with per‑file progress.
  - Soft‑limit 15MB per file in UI; reject with message before upload; show server error if 413.
  - “Save Draft” persists remote state; user can leave and resume; on “Finalize & Continue” call `/api/deals/drafts/{uuid}/finalize/` and redirect to Deal Detail.
- **No gzip:** Remove client compression. Parallelize uploads modestly (eg 3 at a time) with retries; resumability best‑effort (skip re‑uploads if file already has server UUID cached).

**Frontend — File Management Modal**
- **Features:** List files by type with upload button; delete = soft delete flag; restore; per‑file processing status chips; mark “New since last assessment”.
- **Bulk delete:** Keep dialog; send N DELETEs.
- **Metadata form:** Title, description, type tags (if needed), source label (read‑only for Affinity files).

**Research Agent UI**
- **Research page:** Keep existing `research_agent.tsx`; ensure it fetches the stored markdown and component analyses; add link from Deal Detail summary.

**Knowledge Graph (Library) UI**
- **Generic file manager:** Add “Knowledge Graph” menu linking to existing Library files view or implement minimal file manager React page to upload/manage generic files not tied to a deal.

**DevOps/Settings**
- **Request size:** Add Django/Nginx soft limit (eg 15MB) and friendly error mapping; surface configured limit in UI tooltips.
- **Env vars:** Add AFFINITY_* keys, CORESIGNAL_* keys, OCR/Tesseract config if needed; update `.env.example`.
- **Async workers:** Ensure Celery/RQ worker runs ingestion, cleaning, indexing, RA, assessment pipelines; idempotent tasks by file UUID and timestamps.

**Testing & QA**
- **Unit tests:** Filters (`q`, `status`), new endpoints (finalize, archive, new‑since‑assessment), serializers (Draft vs Deal), assessment create/update behavior, file soft delete/restore.
- **Integration tests:** Draft→upload→finalize; send to Affinity flow; reassessment skipping re‑processing; RA triggering rules; RAG budget application.
- **UI tests (smoke):** Deals list tabs + search; Deal Detail actions bar; Mini Memo editing; File modal operations; New Deal upload edge cases (big file).
- **Docs:** Update `brain/apps/deals/AGENTS.md`, `brain/assets/AGENTS.md`, and add `docs/DEAL_WORKFLOW_PRD_NOTES.md` summarizing PRD implementation and verification steps.

**Open Questions / Decisions Needed**
- **Archived visibility:** Should archived deals be editable or read‑only? Can files be managed post‑archive?
- **Affinity notes filter:** Define regex/prefix to exclude AINdex/Brain‑originated notes.
- **Research rerun guard:** Exact criteria for “no new academic/whitepapers” (by mime/type or tag)? Time window vs file list diff?
- **Indexing backend:** Confirm vector store API/capabilities and min similarity threshold target.

**Milestones & Sequencing**
- **M1 — Foundations (backend):** Add status=archived; file provenance/soft delete; finalize/new‑since endpoints; archive endpoint; request size handling; migrations.
- **M2 — Deals List:** Unified page with tabs + search + metadata; counts endpoint.
- **M3 — Deal Detail:** Sectioning + stacked assessments + actions bar; file modal with “new since last”.
- **M4 — Draft Upload:** End‑to‑end draft create, per‑file upload, resume, finalize.
- **M5 — Enrichment + RA:** Affinity files/notes ingest, advisors, RA run + API + summary panel.
- **M6 — Assessment Pipeline:** Context builder + token budget + RAG + LLM call + mapping; reassessment trigger; skip reprocessing.
- **M7 — Knowledge Graph:** Library manager link/page polish.
- **M8 — QA + Docs:** Tests, perf pass, docs, UX polish.

**File/Code Touch Map (high level)**
- `brain/apps/deals/models/{base.py,deals.py,files.py,assesments.py}`: statuses, fields, soft delete, assessment links, migrations.
- `brain/apps/deals/api/{filters.py,serializers.py,views.py,urls.py}`: search/status filters, draft finalize, archive, new‑since‑assessment, send‑to‑affinity, reassess.
- `brain/apps/deals/views.py` + `templates/deals/*`: unify list template; action bar; file modal include; RA link.
- `brain/assets/src/pages/{deals_list.tsx,deal_detail.tsx,deal_upload.tsx}`: new list; detail redesign; draft flow.
- `brain/assets/src/components/file-manager/*`: modal wiring; soft delete/restore; “new since last” flags; size checks.
- `brain/apps/research/*` (or `deals/research/*`): analysis models and API.
- `brain/apps/library/*`: vector search endpoint (if needed) and related UI panel.

**Acceptance Summary**
- Users can: create a draft, upload multiple files individually with size checks, leave and return; finalize to a deal; view a redesigned Deal Detail with stacked AI vs Analyst, edit analyst text inline; open file manager modal to add/remove/restore files and see which are new since last assessment; send to Affinity once per assessment changing status to Active; reassess later, skipping unchanged files and RA when no new papers; archive and find deals under Archived tab; search deals server‑side.

