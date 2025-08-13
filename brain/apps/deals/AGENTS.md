# Deals App Guide

Purpose: deals domain (Deal, DraftDeal, files, decks, papers, dual-use signals). API is implemented; server views/URLs to be added for UI.

## Models (high level)
- `Deal`, `DraftDeal`: core records with `uuid` lookup; relations to `Company`, `Industry`, `DualUseSignal`.
- `DealFile`/`Paper`/`Deck`: attached documents.
- `DualUseSignal`, `DualUseCategory`: taxonomy.

## APIs (DRF)
- Base: `/api/deals/`
- Endpoints: `deals`, `drafts`, `files`, `decks` (list/retrieve + create/upload), `papers`, `du-signals`.
- List/detail via `uuid`; filters available (see `api/filters.py`).

## Server Views & Templates
- URLs: `brain/apps/deals/urls.py` added with names:
  - `dashboard`, `fresh_deals`, `reviewed_deals`, `missed_deals`, `deal_upload`
  - `deal_detail`, `deal_update`, `deal_assessment`, `deal_confirm_delete`, `deck_create`
  - `processing_status` (polling stub), `dashboard_data` (JSON data)
- Templates (ported shells) in `brain/templates/deals/`:
  - `base.html`, `deals_dashboard.html`, `fresh_deals.html`, `reviewed_deals.html`, `missed_deal_list.html`,
    `deal_detail.html`, `deal_assessment.html`, `deal_confirm_delete.html`, `deck_create.html`, `deal_upload.html`.
- Project URLs include `path('deals/', include(('deals.urls','deals'), namespace='deals')))`.

## Adaptation Checklist (Phase 1)
- [done] Add URLs and thin function views that render shells.
- [done] Port templates and prepare React mount points.
- [done T-0203] Implemented `dashboard_data` JSON aggregations (trend, stages, industries, DU signals, counts).
- [done T-0304] Refresh + processing status implemented.

### T-0304 — Refresh + Processing Status (Completed)
- Backend:
  - `views.deal_refresh` (POST-only): sets `Deal.processing_status=STARTED`; if no related files are pending, flips to `SUCCESS` immediately to avoid unnecessary polling.
  - `views.deal_processing_status`: returns `{ ready, deal_status, pending_files }`, where `ready` is true if the deal status is not pending and no files have pending `processing_status`.
  - Bugfix: `Deal.decks_ready` now correctly checks `files.processing_status` (replaces old `ingestion_status`).
- Frontend (Deal Detail):
  - Added a “Refresh Data” button row with live status and disabled state while refreshing.
  - Implements exponential backoff polling of `/deals/<uuid>/processing-status/` (0.5s → capped at 5s, up to 8 attempts). On `ready`, re-fetches deal, decks, and papers.
  - UX: Only the content panels re-render; the button/status row remains stable (no flashing). Initial page load still shows a full skeleton; subsequent refreshes keep existing content visible.
  - Timeout: If readiness isn’t reached after the attempts, shows a non-blocking warning: “Processing is taking longer than expected. Try again later.”

## React Migration (Phase 2)
- Replace Vue dashboard with React charts (react-chartjs-2) calling `deals/dash/data/`.
- Deal Detail/Assessment: React form with optimistic UI and API updates; Affinity send flow via existing endpoints.
- Mount points: `#deals-dashboard-root`, `#deals-fresh-root`, `#deals-reviewed-root`, `#deal-detail-root`, `#deal-assessment-root`.

### Reviewed Deals (T-0402)
- **Template**: `reviewed_deals.html` migrated to `main.html` layout with green review theme
- **Component**: `assets/src/pages/deals_reviewed.tsx` following fresh deals pattern
- **Features**: Search with 300ms debounce, infinite scroll, URL sync, "✓ Reviewed" status indicator
- **API**: Uses `status: 'active'` filter for reviewed deals
- **Theme**: Green color scheme with Export/Filter actions in page header

### Deal Assessment (v2 specifics)
- Endpoint: `/api/deals/assessments/` (create/update latest by `deal=<uuid>`).
- Frontend: `assets/src/pages/deal_assessment.tsx` uses the shared FormRenderer and axios (`lib/http.ts`).
- Choices: Quality percentile options are currently hardcoded client-side; centralize later.
- Success UX: Inline banner with a button back to `/deals/<uuid>/`.

### Deals Dashboard (T-0204)
- Page module: `assets/src/pages/deals_dashboard.tsx`; initialized via single-entry router (`body#_deals-dashboard`).
- Charts: `react-chartjs-2` + `chart.js`, shared palette in `assets/src/lib/charts.ts` (mirrors legacy `du_charts.js`).
- Data: Fetches `/deals/dash/data/` with `date_from` and `date_to` query params; URL params persist via `history.replaceState`.
- Rendered charts:
  - Line: daily deals trend.
  - Pie: funding stage; dual-use signals (with inline legends).
  - Bar: industries (top 10).
- Dependencies added: `chart.js@^4`, `react-chartjs-2@^5` (see `brain/package.json`).

### Dashboard JSON (T-0203)
- View: `deals.views.deals_dashboard_data`.
- Fields: `date_count_trend`, `funding_stage_count`, `industry_count`, `du_signal_count`, plus time-window counts and `quality_percentile_count`, `sent_to_affinity_count`.
- Bugfix: Use `related_query_name` for reverse filters when counting company relations:
  - Grants: `company__grant__isnull=False` (not `grants__isnull`).
  - Clinical studies: `company__clinical_study__isnull=False` (not `clinical_studies__isnull`).
  - Rationale: Django queryset filters require `related_query_name` on reverse lookups; `related_name` is for attribute access.

### Notes
- Time axis uses category labels for simplicity; if time-scale ticks are preferred, add `chartjs-adapter-dayjs-4` and switch the x-scale to `type: 'time'`.

## Related Documents Panel (Epic 6 — T-0601)

- Purpose: Show library documents related to the deal’s company on the Deal Detail page without adding backend routes.
- UI: Tailwind-styled panel titled “Related Documents” with a source filter dropdown and Prev/Next pagination; displays file name (from `file` URL or `src_url`) and optional source label.
- API: Uses existing Library endpoints:
  - Files: `/api/library/files/?company=<company_uuid>&page=<n>&page_size=<m>&source=<source_uuid>`
  - Sources: `/api/library/sources/`
- Params: URL state uses the `dl_` prefix to avoid collisions with other sections: `dl_page`, `dl_size`, `dl_all` (view all = 100), `dl_source`.
- Implementation: `assets/src/components/library/RelatedDocumentsPanel.tsx`; mounted from `assets/src/pages/deal_detail.tsx` below the Decks/Papers row when `deal.company` is present.
- Company Page: A separate Bootstrap-styled Library panel already exists; this change does not modify company templates.

## Upload New Deal (T-0501)

- Purpose: Allow users to upload a PDF deck to create a new Deal in one step.
- Route: `GET /deals/upload/` renders a React island at `#deal-upload-root` on body id `#_deal-upload`.
- API: `POST /api/deals/decks/` (multipart form-data) with `file` only.
  - If `deal` UUID is not provided, a new `Deal` is created (status `new`) with name derived from the PDF filename stem, and a `Company` is auto-created via `Deal.save()`.
  - Response: `{ deck_uuid, deal_uuid, redirect_url }` and client redirects.
- UI: shadcn/ui `Input` (file) and `Button`; simple card; on success, redirect to Deal Detail.
- Discovery: “New Deal” button added to Fresh Deals header linking to `/deals/upload/`.

## Deal Detail Redesign (2025-08)

- Goals: Align Deal Detail with the "VC Deal Detail View Redesign" spec; adopt shadcn/ui + Tailwind; simplify header actions.
- Changes:
  - Removed top-right actions (Download Deck, Refresh Data, Delete) to match the spec’s clean header.
  - Added dual assessments row:
    - AI Assessment (read-only) surfaces `auto_investment_rationale`, `auto_pros`, `auto_cons`, and `auto_quality_percentile` from the latest `DealAssessment`.
    - Analyst (Final) Assessment mirrors the same layout and supports inline editing for investment rationale, pros, cons, and recommendation (via `quality_percentile`).
  - Subtle edit affordance: small "Edit" ghost button within the section header; Save/Cancel buttons use shadcn/ui.
  - JSON/API: extended `DealAssessmentReadSerializer` to expose auto_* read-only fields; write serializer now includes `recommendation` (unused in UI, but available) and `quality_percentile` for recommendation selection.
- Files:
  - Frontend: `assets/src/pages/deal_detail.tsx` — new assessment panels and removal of refresh UI.
  - Backend: `apps/deals/api/serializers.py` — appended auto_* fields in read serializer; exposed `recommendation`.
- Data seeding from Figma:
  - Management command: `python manage.py import_figma_deal brain/seed_data/figma_vc_deal_example.json` (seed_data is gitignored)
  - JSON shape supports `company`, `deal`, `ai_assessment`, `analyst_assessment` keys. Use `--update` with `deal.uuid` to patch.
- Outstanding:
  - If the Figma “app” exports a different schema, adjust the importer mapping accordingly.
  - If we want live refresh, reintroduce status-only indicator without actions (kept out per spec).

## Dev Utilities

- `create_dummy_deal`: Create one or more fully-populated deals with company, funding, industries, dual-use signals, real PDF deck attachments, a paper (with PDF), and both AI/Analyst assessment fields filled.
  - Run: `python manage.py create_dummy_deal [--count 3]`
  - Output prints created deal UUIDs. Visit `/deals/<uuid>/`.
  - Decks and Papers attach small in-memory PDF files; no external downloads required.
- `import_figma_deal`: Import a Deal from a Figma-style JSON export (company + deal + assessments).
  - Run: `python manage.py import_figma_deal <path/to/file.json> [--update]`
  - Suggested path: `brain/seed_data/figma_vc_deal_example.json` (gitignored). See `brain/seed_data/README.md`.

## File Management System (T-0801 - Aug 2025)

### Overview
Complete rewrite of the deal upload workflow with comprehensive file management capabilities. Supports three distinct workflows:
1. **Draft Deal Files** - Multi-file uploads staged before deal submission  
2. **Existing Deal Files** - File management for live deals
3. **Knowledge Base Files** - General library uploads

### Architecture

#### Frontend Components
- **FileManager** (`components/file-manager/FileManager.tsx`) - Main orchestration component with three modes
- **FileUpload** (`components/file-manager/FileUpload.tsx`) - Drag-and-drop upload with validation
- **FileTable** (`components/file-manager/FileTable.tsx`) - TanStack Table with bulk operations
- **FileMetadataForm** (`components/file-manager/FileMetadataForm.tsx`) - React Hook Form + Zod validation
- **BulkOperations** - BulkMetadataDialog, BulkDeleteConfirmDialog for batch file management

#### API Integration Hooks
- **useDraftDeals** (`hooks/useDraftDeals.ts`) - Draft deal CRUD operations
- **useFileManagement** (`hooks/useFileManagement.ts`) - File operations for existing deals and library
- **useDraftPersistence** (`hooks/useDraftPersistence.ts`) - localStorage auto-save with conflict detection

#### Key Features
- **Multi-file upload** with drag-and-drop interface
- **File validation** (type, size, duplicate detection)
- **Metadata management** per file (category, document_type, proprietary, tldr, tags)
- **Bulk operations** (delete, update metadata, reprocess)
- **Inline editing** with Popover components
- **Draft persistence** with localStorage auto-save and conflict resolution
- **Progress tracking** for uploads and processing status
- **Row selection** with TanStack Table for batch operations

### Draft Deal Workflow

#### Backend APIs (DRF)
- `POST /api/deals/draft_deals/` - Create draft deal
- `PATCH /api/deals/draft_deals/{uuid}/` - Update draft metadata  
- `POST /api/deals/deal_files/` - Upload files to draft deal
- `POST /api/deals/draft_deals/{uuid}/finalize/` - Convert draft to live deal

#### Frontend Flow
1. **File Upload Tab** - Users drag/drop multiple files
2. **Metadata Tab** - Configure deal info and per-file metadata
3. **Draft Persistence** - Auto-save to localStorage every 30 seconds
4. **Submission** - Upload files with metadata, then finalize draft
5. **Cleanup** - Remove localStorage draft on successful submission

#### Draft State Management
```typescript
interface DraftState {
  draftId: string;
  dealName: string;
  description?: string;
  website?: string;
  fundingTarget?: string;
  files: FileMetadata[];
  lastSaved: number;
  version: number;
}
```

### Existing Deal File Management

#### Features
- View all files in paginated table with sorting/filtering
- Upload additional files to existing deals
- Bulk operations: delete, update metadata, reprocess files
- Inline editing of file metadata
- Download files with proper filename handling

#### API Endpoints
- `GET /api/deals/deal_files/?deal={uuid}` - List deal files
- `POST /api/deals/deal_files/` - Upload new file to deal
- `PATCH /api/deals/deal_files/{uuid}/` - Update file metadata
- `DELETE /api/deals/deal_files/{uuid}/` - Delete file
- `POST /api/deals/deal_files/{uuid}/reprocess/` - Reprocess file
- `POST /api/deals/deal_files/bulk_*` - Bulk operations

### Library File Management

Similar to deal files but for general knowledge base:
- `GET /api/library/files/` - List library files
- `POST /api/library/files/` - Upload to library
- Bulk operations and metadata management

### Form Validation (Zod Schema)

```typescript
const dealFormSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  fundingTarget: z.string().optional(),
  files: z.array(fileMetadataSchema).min(1, "At least one file is required")
});

const fileMetadataSchema = z.object({
  id: z.string(),
  category: z.string().min(1, "Category is required"),
  documentType: z.string().optional(),
  proprietary: z.boolean().default(false),
  tldr: z.string().optional(),
  tags: z.array(z.string()).default([])
});
```

### File Upload Integration

#### Replaced Legacy Upload
- **Old**: `deal_upload.tsx` with single PDF upload
- **New**: `FileManager` component with multi-file support
- **URL**: `/deals/upload/` now renders comprehensive file management interface

#### Validation Rules
- **File Types**: PDF, DOC, DOCX, TXT, MD (configurable)
- **File Size**: 50MB limit per file (configurable)
- **File Count**: 1-20 files for draft deals (configurable)
- **Duplicate Detection**: Prevents same file name + size combinations

### UI/UX Improvements

#### Design System
- **shadcn/ui components** for consistent styling
- **Tailwind CSS** with shadow-sm instead of borders
- **Responsive design** with proper mobile support
- **Loading states** and progress indicators
- **Error handling** with inline validation messages

#### Accessibility
- **ARIA labels** on all form controls and buttons
- **Keyboard navigation** support
- **Screen reader** compatible table structure
- **Focus management** in modals and dialogs

### Conflict Resolution

#### localStorage Conflicts
- **Detection**: Version tracking prevents data loss from multiple tabs
- **Resolution**: User choice between local changes or remote state
- **Recovery**: Auto-discovery of unsaved drafts on page load

#### Error Handling
- **Network failures**: Retry mechanisms with exponential backoff
- **Validation errors**: Inline field-level error display
- **Upload failures**: Per-file error states with retry options

### Performance Optimizations

#### Client-Side
- **Debounced validation** (300ms) for real-time feedback
- **Virtual scrolling** for large file lists (TanStack Table)
- **Lazy loading** of metadata forms
- **Request batching** for bulk operations

#### Bulk Operations
- **Client-side loops** for operations not supported by backend
- **Progress tracking** for long-running batch operations
- **Optimistic updates** with rollback on failure

### File Processing Status

#### Integration Points
- **Real-time updates** placeholder for WebSocket integration
- **Status polling** for processing progress
- **Visual indicators** for file processing states (pending, processing, completed, error)

### Error Recovery

#### Upload Failures
- **Per-file retry** without affecting other uploads
- **Partial success handling** for batch uploads
- **User-friendly error messages** with actionable guidance

#### Draft Recovery
- **Auto-save conflicts** resolved with user intervention
- **Expired draft cleanup** (7-day expiration)
- **Version mismatch detection** between tabs/windows

### Toast Notification System (T-0814)

#### Integration with File Management
- **Draft save feedback** using toast notifications instead of persistent alerts
- **Non-blocking UX** allowing continued work during notification display
- **Intelligent positioning** above sticky bottom bars with proper z-index hierarchy
- **Auto-dismiss** after 3 seconds for optimal user experience

#### Implementation
- **Components**: Sonner-based toast system documented in `assets/AGENTS.md`
- **Integration points**: FileManager auto-save notifications and FileMetadataForm manual save
- **Design patterns**: Immediate feedback (alerts) vs delayed feedback (toasts) hierarchy

For detailed toast system architecture, see `assets/AGENTS.md → Toast Notification System`.

### File Upload Flow Fixes (T-0815)

#### Form Data Persistence Enhancement
- **Tab Change Persistence**: Form data automatically saved when switching away from Configure Details tab
- **Reference-Based Access**: Using `formRef` to access form data without reactive dependencies
- **State Restoration**: Complete form state including active tab restored from draft storage
- **Infinite Loop Prevention**: Non-reactive form access prevents circular dependencies

#### Upload Process Redesign
- **Submit Button Availability**: Always enabled regardless of file upload status
- **Form-Only Validation**: Submit validation focuses exclusively on required form fields
- **Upload on Submit**: Files upload only when "Submit for Underwriting" is clicked
- **Progress Overlay**: Full-screen modal with real-time upload progress and file status

#### User Experience Improvements
- **Predictable Navigation**: No automatic tab switching after file selection
- **Clear Progress Feedback**: Sequential upload with individual file progress tracking
- **Enhanced Error Handling**: Specific error messages for upload failures
- **Non-Blocking Errors**: Upload failures don't cause unexpected navigation

#### Technical Integration Points
- **FileManager.tsx**: Enhanced with upload state management and progress tracking
- **FileMetadataForm.tsx**: Simplified validation logic focusing on form fields only
- **UploadProgressOverlay.tsx**: New component providing comprehensive upload feedback
- **useDraftPersistence.ts**: Extended to include active tab state in draft storage

For detailed implementation documentation, see `assets/AGENTS.md → File Upload Flow Fixes`.

## Changelog — Aug/Dec 2025

- **File Upload Flow Fixes (T-0815)** - Critical fixes for form data persistence and upload timing issues
- **File Management System** - Complete rewrite with multi-file upload, draft workflow, and bulk operations
- **Draft Deal Persistence** - localStorage auto-save with conflict detection and recovery
- **TanStack Table Integration** - Advanced table with row selection, sorting, filtering, and pagination
- **Form Validation** - React Hook Form + Zod with real-time validation and error handling
- **Bulk Operations** - Comprehensive file management with batch delete, update, and reprocess
- **UI Redesign** - shadcn/ui components with consistent shadow-sm styling
- **useFieldArray Bug Fix** (Dec 2025) - Fixed FileMetadataForm display issue caused by ID mismatch
- Added AI/Analyst assessments panel to Deal Detail page and removed header actions.
- Extended `DealAssessmentReadSerializer` to include AI `auto_*` fields; write serializer includes `recommendation`.
- Implemented `import_figma_deal` and `create_dummy_deal` management commands.

## Development Guidelines

### Documentation Standards
- **Primary Documentation**: AGENTS.md files for detailed implementation guides
- **Secondary Documentation**: CLAUDE.md for development commands and high-level architecture  
- **Design Patterns**: docs/design.md for UI/UX patterns and component guidelines
- **Bug Documentation**: Always document major fixes with root cause analysis

### React Development Best Practices
- **useFieldArray Pattern**: Use `form.watch(`items.${index}.id`)` for data lookups, not `field.id`
- **Error Handling**: Parse structured API errors and provide actionable user feedback
- **State Management**: Prefer form state over component state for form-related data
- **Component Architecture**: Document complex component interactions and data flow
