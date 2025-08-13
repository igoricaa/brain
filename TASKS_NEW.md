**Deal Upload, Management, Assessment — Frontend‑First Plan (aligned to current backend)**

- **Scope:** Frontend implements draft → upload (per‑file) → review → assess → send/activate → reassess → archive UX against existing Brain APIs. Avoid gzip on client; upload files individually with soft limits. Unify Deals list (tabs), add server search when backend exposes it. Redesign Deal Detail with stacked AI vs Analyst, file manager modal, and anchored actions bar. Add Library file manager link.
- **Assumptions:** Current backend is authoritative; we minimize backend changes. We call out explicit backend dependencies where gaps exist. Existing APIs used: `/api/deals/*`, `/api/library/*`, `/api/companies/*`. OCR/cleaning/research pipelines are backend concerns; frontend surfaces progress and results.

**Backend Dependencies (no direct changes here; required/optional support)**
- **Statuses:** 🟡 PARTIAL - Backend currently exposes `DealStatus = {new, active, subcommittee vetting}`; ❌ there is no `archived`. Frontend will show New and Active tabs (+ All). Backend to add `archived` later to enable the Archived tab.
- **Deals search:** ❌ NOT STARTED - Current `DealFilter` has created/updated range filters but no text search. Backend to add `q` filter (company/deal name icontains) for server‑side search. Until then: client‑side filter only for the small "Fresh/New" list.
- **Draft flow:** ✅ COMPLETED - Present. Use `/api/deals/drafts/` (create/update/delete) and `/api/deals/drafts/{uuid}/finalize/` (POST). DraftDeal proxy model working correctly.
- **Upload endpoints:** ✅ COMPLETED - `/api/deals/decks|files|papers/` require a `deal` UUID now (no auto‑create Deal in Deck create). Frontend must create a draft first, then upload each file with `deal=<draft_uuid>`.
- **Assessments API:** 🟡 PARTIAL - `/api/deals/assessments/` exists with PRD‑aligned fields (`problem_solved`, `tam`, etc.) and `auto_*` mirrors. Use `?deal=<deal_uuid>` to get/set latest. ❌ No "send‑to‑affinity" API action yet.
- **Send to Affinity:** 🟡 PARTIAL - Model method exists (`Deal.send_to_affinity`), but ❌ no API endpoint/action. Backend to expose an action for one‑click send (and mark `sent_to_affinity` true).
- **Reassess trigger:** ❌ NOT STARTED - No explicit endpoint. Backend to expose a reassessment action (idempotent) that enqueues the pipeline and returns processing status.
- **"New since last assessment":** 🟡 PARTIAL - Deal list annotates `last_assessment_created_at`. Frontend can compute new files by comparing `DealFile.created_at` to this value. Optional backend endpoint can be added later.
- **Library/Knowledge Graph:** ✅ COMPLETED - `/api/library/*` endpoints exist (files, papers, authors, sources). No vector "chunk search" or RAG endpoint is exposed; RA/RAG remain backend concerns.

**Frontend — What exists and how we consume it**
- **Routers:** ✅ COMPLETED - `brain/brain/api_urls.py` exposes `/api/deals/*`, `/api/library/*`, `/api/companies/*`, `/api/socialgraph/*`, `/api/dual-use/*`.
- **Deals API:**
  - ✅ Lists/details at `/api/deals/deals/`; filter by `status`, `created/updated` ranges; annotated `last_assessment_created_at` present on read serializer.
  - ✅ Drafts at `/api/deals/drafts/` (+ `.../{uuid}/finalize/`).
  - ✅ Files: `/api/deals/files/`; Decks: `/api/deals/decks/`; Papers: `/api/deals/papers/`. Each requires `deal=<uuid>`; shapes mirror Library File/Paper read serializers plus a `deal` relation.
  - 🟡 Assessments: `/api/deals/assessments/` using PRD field names - API exists but no automation pipeline.
- **Library API:** ✅ COMPLETED - Complete for files/papers/authors/sources; used for Related Documents panel and Knowledge Graph.
- **Server pages:** 🟡 PARTIAL - Fresh/Reviewed/Missed and Deal Detail shells exist with React mount points. New Deal Upload shell exists and works with draft flow.

**Frontend — Global/Navigation**
- **Nav updates:**
  - 🟡 PARTIAL - Keep existing dashboard pages for now; add a new unified `Deals Overview` page later. Menu: Deals (Overview), + New Deal, Knowledge Graph, Dual‑use, Companies.
  - ✅ Wire `{% vite_asset %}` entries in corresponding templates; maintain HMR in dev.

**Frontend — Deals List (near‑term vs. unified later)**
- **Near‑term:**
  - 🟡 PARTIAL - Keep Fresh and Reviewed pages; status filtering may need fixes.
  - ❌ Add client‑side search for Fresh (<=50 items typical). Reviewed may omit search until server `q` exists.
  - 🟡 Show per‑deal metadata: company name, age, fundraise, industries, dual‑use tags, and show "assessed recently" using `last_assessment_created_at`.
- **Unified page (later):**
  - ❌ NOT STARTED - New React page `src/pages/deals_list.tsx` with tabs: New, Active, All (Archive tab disabled until backend adds status). Server‑side pagination; debounced `q` search once backend adds it.

**Frontend — Deal Detail Redesign**
- **Sectioning:**
  - 🟡 PARTIAL - Basic card (SSR) with company, website, status, funding stage, created date (already present).
  - ❌ External data accordions: Founders, Grants, Clinical Trials, Patent Applications; auto‑expand only if count > 0; include +Add Founder/Patent buttons if backend UIs exist.
  - ❌ Research agent summary: render two markdown blocks (tech assessment, team assessment) if backend provides; otherwise show placeholder with link to `research-agent` shell.
  - ❌ Mini Memo: stack AI (read‑only) over Analyst (editable). Map fields to current serializer names. Include upper PRD fields as text with pencil edit affordance.
- **Actions bar (anchored):** ❌ NOT STARTED - Buttons: Send to Affinity, Reassess, Edit Files, Refresh Data, Underwriting History, Archive, Delete. Persist across scroll.
- **New since last assessment:** ❌ NOT STARTED - Compute client‑side via `file.created_at > deal.last_assessment_created_at`. Visually flag in modal and context preview.

**Frontend — Deal Creation & Drafts (aligned with backend)**
- **Flow:**
  - ✅ COMPLETED - On open, `POST /api/deals/drafts/` to create a draft deal; cache `draft_uuid` in IndexedDB.
  - ✅ Upload each file individually to `/api/deals/decks|files|papers/` with `deal=<draft_uuid>`; 3‑at‑a‑time concurrency with retry. Enforce soft size limit 15MB per file in UI.
  - ✅ Show per‑file progress; on success, list appears in modal. "Save Draft" persists server‑side; "Finalize & Continue" calls `/api/deals/drafts/{uuid}/finalize/`.
- **No gzip:** ✅ COMPLETED - Remove any client compression; rely on individual uploads.

**Frontend — File Management Modal**
- **Features:**
  - ✅ COMPLETED - Use Deals Files API for listing and delete; DELETE will remove file. 
  - ✅ Group by type (Decks/Papers/Other); upload buttons for each; show processing status chip from `processing_status`.
  - ❌ Mark "New since last assessment" client‑side as above.
- **Metadata form:** 🟡 PARTIAL - Basic metadata editing exists but needs full form integration.

**Frontend — Research Agent UI**
- **Research page:** 🟡 PARTIAL - Keep existing `research_agent.tsx` shell. Complete UI with mock data but no backend integration. Note: Sidebar shows "Research Agent removed - now embedded in deal details".

**Frontend — Knowledge Graph (Library) UI**
- **Generic file manager:** ✅ COMPLETED - Comprehensive Library page exists with full file management, filtering, search, stats dashboard, and upload capabilities.

**QA & Documentation**
- **Smoke tests:** 🟡 PARTIAL - Some features work but need comprehensive testing of all flows.
- **Acceptance:** 🟡 UI behaves with current backend (no `q`, no `archived`, no send/reassess endpoints yet). Features that depend on backend actions are present but disabled or no‑op with explanatory tooltips.
- **Docs:** 🟡 PARTIAL - `brain/apps/deals/AGENTS.md` and `brain/assets/AGENTS.md` exist but need updates for actual field names and flows.

**Backend requests (minimal)**
- ❌ Add `q` to DealFilter (company/deal name icontains) for server search.
- ❌ Add `archived` status to DealStatus and support filtering.
- ❌ Add `POST /api/deals/deals/{uuid}/send-to-affinity/` (calls `Deal.send_to_affinity`) returning result and flipping `status=new→active`.
- ❌ Add `POST /api/deals/deals/{uuid}/reassess/` to enqueue reassessment and return processing state.

**Milestones (frontend‑first)**
- M1: ✅ COMPLETED - Draft Upload UI wired to drafts + files endpoints; progress, size checks, finalize flow.
- M2: ❌ Deal Detail stacked AI/Analyst assessments mapped to new serializer fields; anchored actions bar (buttons stubbed as needed).
- M3: 🟡 PARTIAL - File Management Modal integrated with Deals Files/Papers/Decks; "new since last" flagging missing.
- M4: 🟡 Fresh/Reviewed pages polish; client search on Fresh missing; counts and badges partial.
- M5: ❌ Unified Deals page (tabs New/Active/All) gated behind feature flag; enable server `q` when backend ready.
- M6: ✅ COMPLETED - Knowledge Graph page/panel polish; Library file manager link.

**Backend — Processing Pipelines**
- **OCR & cleaning:** ❌ NOT STARTED - On new DealFile (Deck, Paper, File):
  - OCR each file; store raw extracted text.
  - Cleaning rules: pitch decks and any file >5k tokens (except academic/whitepapers) → run "clean faithfully, reduce tokens" prompt; other files → summary prompt. Save `cleaned_text`, `tokens_estimate`.
  - Extract company facts (name, domain, founders) and dual‑use signals from cleaned pitch deck; update Deal/Company fields cautiously (don't overwrite non‑null manual edits without flags).
- **Indexing:** ❌ NOT STARTED - Index cleaned or raw text into document index / knowledge graph with file metadata; attach to company/deal nodes.
- **Affinity enrichment:** 🟡 PARTIAL - Using company domain, attempt to resolve Affinity organization/ID; Task structure exists but implementation missing:
  - Files: fetch and add as DealFiles with `source=affinity`, set `affinity_file_id`; don't de‑dupe beyond ID check; respect `soft_deleted` (don't re‑add over soft‑deleted).
  - Notes: fetch via notes API; ingest notes not authored by AINdex/Brain (regex marker); ignore duplicates. Re‑run standard file processing on downloaded files.
- **Advisor profiles:** ❌ NOT STARTED - Extend enrichment to include advisors from Coresignal, paralleling founders.
- **Research agent run:** ❌ NOT STARTED - After enrichment completes and deck text exists, run RA with inputs. UI exists with mock data only.
- **Assessment pipeline:** ❌ NOT STARTED
  - Build dynamic context using priority list (previous assessment deltas first, then cleaned deck, Affinity notes, RA outputs, founders, grants, patents, clinical studies, other cleaned files) respecting hard cap 50k tokens.
  - Compute pre‑RAG length; set `rag_budget = min(50k - context, 10k)`; if budget >= ~2k, run vector search using 3 RA queries (from `ResearchAnalysis.search_queries`), merge results by score and trim to budget; skip if budget exhausted.
  - Submit final prompt with context + RAG + instructions appended last; parse JSON; map to fields on `DealAssessment` (manual fields) and `auto_*` where appropriate; do not compute composite score in LLM.
  - Never re‑process files unchanged since last assessment; reuse cached cleaned texts and embeddings.

**Frontend — Global/Navigation**
- **Nav updates:**
  - 🟡 PARTIAL - Basic navigation exists but needs unified deals link.
  - ✅ Update `brain/templates/includes/sidebar_nav.html` accordingly.
- **Vite entries:** ✅ COMPLETED - Ensure entries for `src/pages/deals_list.tsx` (new unified), `deal_detail.tsx` (exists), `deal_upload.tsx` (exists), `research_agent.tsx` (exists). Verify `{% vite_asset %}` includes on pages.

**Frontend — Deals List (Unified)**
- **Single page with tabs:** ❌ NOT STARTED - React page `src/pages/deals_list.tsx` with status tabs: New, Active, Archived, All.
- **Server search:** ❌ Text input debounced 300ms calling `/api/deals/deals/?status=<>&q=<>`.
- **Columns:** ❌ Company (links to latest assessment detail), Age, Fundraise, Status ("Active (Nx run)"), Industries tags, Dual‑use signals tags, External signals badges (n founders, n grants, n patent apps; hide 0s).
- **Pagination:** ❌ Server‑side (cursor or page) with infinite scroll or standard pagination.
- **Bulk UI hooks (optional):** ❌ Checkbox selection; actions (archive, delete) operate by sending N individual requests.
- **Acceptance:** ❌ Status tabs filter; search narrows correctly; clicking row opens deal detail.

**Frontend — Deal Detail Redesign**
- **Sectioning:**
  - 🟡 PARTIAL - Basic deal data: compact header card (already SSR); keep company, website, status, funding stage, created date.
  - ❌ External data: Founders, Grants, Clinical Trials, Patent Applications panels.
  - ❌ Research agent summary: two large markdown displays (tech assessment and team summary) with "Open Research Agent" link.
  - ❌ Mini Memo: stack AI Assessment (read‑only) above Analyst Assessment (inline editable).
- **Actions bar (bottom anchored):** ❌ NOT STARTED - Buttons: Send to Affinity, Reassess, Edit Files, Refresh Data, Underwriting History, Archive, Delete. Persistently visible.
- **"New since last assessment":** ❌ In file modal and RA context sidepanel, flag files added since latest assessment.
- **Acceptance:** ❌ Edit fields persist via `/api/deals/assessments/`; send‑to‑affinity transitions `new→active` and disables; archive moves to Archived tab.

**Frontend — Deal Creation & Drafts**
- **Draft flow:**
  - ✅ COMPLETED - On opening New Deal, immediately `POST /api/deals/drafts/` to get `draft_uuid`; cache in IndexedDB with a local temp ID; sync mapping.
  - ✅ Upload files individually (one by one) referencing `deal=<draft_uuid>` to `/api/deals/decks|papers|files/` with per‑file progress.
  - ✅ Soft‑limit 15MB per file in UI; reject with message before upload; show server error if 413.
  - ✅ "Save Draft" persists remote state; user can leave and resume; on "Finalize & Continue" call `/api/deals/drafts/{uuid}/finalize/` and redirect to Deal Detail.
- **No gzip:** ✅ COMPLETED - Remove client compression. Parallelize uploads modestly (eg 3 at a time) with retries.

**Frontend — File Management Modal**
- **Features:** ✅ COMPLETED - List files by type with upload button; delete works; per‑file processing status chips; ❌ "New since last assessment" not implemented.
- **Bulk delete:** ✅ Keep dialog; send N DELETEs.
- **Metadata form:** 🟡 PARTIAL - Title, description, type tags (if needed), source label (read‑only for Affinity files).

**Research Agent UI**
- **Research page:** 🟡 PARTIAL - Keep existing `research_agent.tsx`; Complete UI exists with mock data, no backend integration.

**Knowledge Graph (Library) UI**
- **Generic file manager:** ✅ COMPLETED - "Knowledge Graph" menu links to comprehensive Library page with full file management capabilities.

**DevOps/Settings**
- **Request size:** 🟡 PARTIAL - Add Django/Nginx soft limit (eg 15MB) and friendly error mapping; surface configured limit in UI tooltips.
- **Env vars:** 🟡 Add AFFINITY_* keys, CORESIGNAL_* keys, OCR/Tesseract config if needed; update `.env.example`.
- **Async workers:** ❌ NOT STARTED - Ensure Celery/RQ worker runs ingestion, cleaning, indexing, RA, assessment pipelines; idempotent tasks by file UUID and timestamps.

**Testing & QA**
- **Unit tests:** ❌ NOT STARTED - Filters (`q`, `status`), new endpoints (finalize, archive, new‑since‑assessment), serializers (Draft vs Deal), assessment create/update behavior, file soft delete/restore.
- **Integration tests:** ❌ NOT STARTED - Draft→upload→finalize; send to Affinity flow; reassessment skipping re‑processing; RA triggering rules; RAG budget application.
- **UI tests (smoke):** 🟡 PARTIAL - Deals list tabs + search missing; Deal Detail actions bar missing; Mini Memo editing missing; File modal operations work; New Deal upload works.
- **Docs:** 🟡 PARTIAL - Update `brain/apps/deals/AGENTS.md`, `brain/assets/AGENTS.md`, and add `docs/DEAL_WORKFLOW_PRD_NOTES.md` summarizing PRD implementation and verification steps.

**Open Questions / Decisions Needed**
- **Archived visibility:** Should archived deals be editable or read‑only? Can files be managed post‑archive?
- **Affinity notes filter:** Define regex/prefix to exclude AINdex/Brain‑originated notes.
- **Research rerun guard:** Exact criteria for "no new academic/whitepapers" (by mime/type or tag)? Time window vs file list diff?
- **Indexing backend:** Confirm vector store API/capabilities and min similarity threshold target.

**Milestones & Sequencing**
- **M1 — Foundations (backend):** ❌ Add status=archived; file provenance/soft delete; finalize/new‑since endpoints; archive endpoint; request size handling; migrations.
- **M2 — Deals List:** ❌ Unified page with tabs + search + metadata; counts endpoint.
- **M3 — Deal Detail:** ❌ Sectioning + stacked assessments + actions bar; file modal with "new since last".
- **M4 — Draft Upload:** ✅ COMPLETED - End‑to‑end draft create, per‑file upload, resume, finalize.
- **M5 — Enrichment + RA:** ❌ Affinity files/notes ingest, advisors, RA run + API + summary panel.
- **M6 — Assessment Pipeline:** ❌ Context builder + token budget + RAG + LLM call + mapping; reassessment trigger; skip reprocessing.
- **M7 — Knowledge Graph:** ✅ COMPLETED - Library manager link/page polish.
- **M8 — QA + Docs:** 🟡 PARTIAL - Tests, perf pass, docs, UX polish.

**File/Code Touch Map (high level)**
- `brain/apps/deals/models/{base.py,deals.py,files.py,assesments.py}`: ✅ statuses, fields, assessment links, migrations. ❌ soft delete missing.
- `brain/apps/deals/api/{filters.py,serializers.py,views.py,urls.py}`: 🟡 PARTIAL - ❌ search/status filters, ✅ draft finalize, ❌ archive, new‑since‑assessment, send‑to‑affinity, reassess.
- `brain/apps/deals/views.py` + `templates/deals/*`: 🟡 unify list template; ❌ action bar; ✅ file modal include; ❌ RA link.
- `brain/assets/src/pages/{deals_list.tsx,deal_detail.tsx,deal_upload.tsx}`: ❌ new list; ❌ detail redesign; ✅ draft flow.
- `brain/assets/src/components/file-manager/*`: ✅ modal wiring; ❌ soft delete/restore; ❌ "new since last" flags; ✅ size checks.
- `brain/apps/research/*` (or `deals/research/*`): ❌ NOT STARTED - analysis models and API.
- `brain/apps/library/*`: ✅ COMPLETED - full library functionality; ❌ vector search endpoint (if needed).

**Acceptance Summary**
- Users can: ✅ create a draft, upload multiple files individually with size checks, leave and return; finalize to a deal; 🟡 view a basic Deal Detail (redesign pending); ✅ open file manager modal to add/remove files; ❌ send to Affinity, reassess, archive not implemented; ❌ search deals server‑side not available.

## OVERALL STATUS SUMMARY

### ✅ COMPLETED (40%)
- Draft deal creation and management
- File upload system with progress tracking
- File management modal (FileManager)
- Knowledge Graph/Library page
- Basic API structure and models
- Navigation framework

### 🟡 PARTIAL (25%)
- Deal list pages (separate, not unified)
- Assessment models (no automation)
- Affinity integration (fields only)
- Research Agent (UI only)
- Documentation

### ❌ NOT STARTED (35%)
- Unified deals list with tabs
- Deal detail redesign (anchored bar, stacked assessments)
- Backend processing pipelines (OCR, cleaning, indexing)
- Search functionality
- Archive status and management
- Assessment automation
- API action endpoints

### 🚫 WON'T DO (based on current priorities)
- None identified - all features appear to be planned