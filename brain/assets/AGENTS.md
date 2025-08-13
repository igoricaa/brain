# Frontend Assets Guide (Vite + React)

This folder hosts the hybrid frontend for brain using React 19 and Vite 7.1.1.

## Layout

- `vite.config.ts`: base `/static/`, `build.outDir='assets/dist'`, `manifest=true`.
- `src/main.tsx`: single global entry that dynamically imports page modules by `document.body.id`.
- `src/pages/*`: page modules exporting `initialize()` (e.g., `company_detail.tsx`, `deals_dashboard.tsx`).
- `src/lib/*`: shared helpers (e.g., `lib/charts.ts` registers Chart.js + legacy palette).
- `tsconfig.json`: TS settings for Vite React.

## UI Layout Architecture (T-0401 Sidebar Redesign)

- **Layout Structure**: Fixed sidebar navigation (`w-64` left) with content area offset (`ml-64`).
- **Template Integration**: `main.html` loads `includes/sidebar_nav.html` for consistent navigation.
- **Background**: App uses `bg-slate-50` for modern, clean aesthetic.
- **Navigation**: brAINbrAIN branding with dark navy sidebar (`bg-slate-900`).
- **Design System**: Follows fresh deals pattern with colorful metric cards and clean typography.

## Commands (from brain/)

- `npm run dev`: Vite dev server (HMR) at 5173.
- `npm run build`: production build to `assets/dist` with `manifest.json`.
- `npm run lint` / `npm run format`: ESLint + Prettier.

## Django Integration

- Base: `{% load django_vite %}{% vite_hmr_client %}{% vite_asset 'src/main.tsx' %}` only. Page code is lazy-loaded by `main.tsx`.
- Body IDs used by router: `_company-detail`, `_grant-create`, `_deals-dashboard`, `_deals-fresh`, `_deals-reviewed`, `_deal-detail`, `_deal-assessment`, `_deal-upload`, `_du-dashboard`, `_founders-list`, `_advisors-list`.

## Adding a New Page Module

1. Create `src/pages/my_page.tsx` that exports `initialize()` and mounts into a known root element.
2. Add a body id in the Django template (e.g., `<body id="_my-page">`).
3. Register it in `pageModules` within `src/main.tsx`: `'_my-page': () => import('./pages/my_page')`.

### People Lists (Founders/Advisors)

- Modules: `src/pages/founders.tsx` and `src/pages/advisors.tsx` mount into `#founders-root` and `#advisors-root` on body IDs `#_founders-list` and `#_advisors-list` respectively.
- Data: `/api/companies/founders` and `/api/companies/advisors` (DRF page-number pagination: `?q=<query>&page=<n>&page_size=30`, optional `ordering=-created_at`).
- Hooks: `src/hooks/usePeople.ts` (`useFounders`, `useAdvisors`) with `keepPreviousData` and 30s `staleTime`.
- UI: shadcn/ui `Input`, `Table`, `Button`, `Badge`, `Skeleton`; Tailwind layout mirrors Fresh Deals header/search/table.
- UX: 300ms debounced search; URL sync for `q` and `page`; Cmd/Ctrl+K focuses search; up to 3 company chips with `+N` overflow.
- Quick preview: In DevTools set `document.body.id` to the body id and append the root div; the page will mount and fetch APIs immediately.

## Notes

- Keep modules small; share logic via `src/components` and `src/lib`.
- Prefer DRF endpoints under `/api/*` and handle auth via same-origin credentials.
- React Forms: Use the shared FormRenderer (react-hook-form + zod) with API submission via TanStack Query + Axios. See below.

## Deals Components (React)

### Dashboard (`deals_dashboard.tsx`)

- Module: `src/pages/deals_dashboard.tsx` mounts at `#deals-dashboard-root` on body `#_deals-dashboard`.
- **Design**: Colorful metric cards with icons and period comparisons (Today/Week/Month/Total).
- **Components**: `MetricCard` with colored backgrounds (`bg-blue-100`, `bg-red-100`, etc.), `ChartCard` for data visualization.
- Charts: `react-chartjs-2` + `chart.js`; updated colors (`#3B82F6` blue theme), clean chart styling.
- Data: `/deals/dash/data/`; removed date filters for simplified UX.
- **Recent Activity**: Sample activity feed with emoji indicators and company information.

### Fresh Deals (`deals_fresh.tsx`)

- Module: `src/pages/deals_fresh.tsx` mounts at `#deals-fresh-root` on body `#_deals-fresh`.
- **API**: Uses `status: 'new'` filter with search and infinite scroll.
- **Features**: 300ms debounced search, Cmd+K focus, URL sync, "0 Pending" indicator.
- **CTA**: Primary "New Deal" button links to `/deals/upload/`.

### Upload Deal (`deal_upload.tsx`)

- Module: `src/pages/deal_upload.tsx` mounts at `#deal-upload-root` on body `#_deal-upload`.
- UI: Large drag-and-drop area (≈60vh) with click-to-browse overlay; shadcn/ui `Button`; PDF-only.
- API: Posts `multipart/form-data` to `/api/deals/decks/` with `file` only; on success, redirects to `/deals/<uuid>/` from response `redirect_url`.
- Discovery: Also accessible via the left sidebar "Upload New Deal" button and Fresh Deals header CTA.

### Past Deals (`deals_reviewed.tsx`)

- Module: `src/pages/deals_reviewed.tsx` mounts at `#deals-reviewed-root` on body `#_deals-reviewed`.
- **API**: Uses `status: 'active'` filter for reviewed deals.
- **Theme**: Green color scheme with "✓ Reviewed" indicator and Export/Filter actions.
- **Features**: Same search/scroll patterns as Fresh Deals with reviewed-specific styling.

## Dependencies

- Runtime: `react`, `react-dom`.
- Charts: `chart.js@^4`, `react-chartjs-2@^5` (installed in `brain/package.json`).
- Forms/API: `react-hook-form`, `@hookform/resolvers`, `zod@^4`, `@tanstack/react-query`, `axios`.
- Async Validation: Built on existing TanStack Query infrastructure with custom hooks and utilities.

## Tailwind CSS (v4)

- Installed: `tailwindcss` and `@tailwindcss/vite` (devDependencies).
- Vite plugin: `tailwindcss()` added in `assets/vite.config.ts`.
- Global CSS: `assets/src/styles/tailwind.css` contains `@import "tailwindcss";` and is imported in `assets/src/main.tsx` so Tailwind is global.
- Template scanning: Tailwind v4 is zero-config; to include server templates outside Vite’s root, `tailwind.css` declares sources:
    - `@source "../templates";`
    - `@source "../apps";`
      This ensures classes used in Django templates are generated without a Tailwind config file.
- Preflight: enabled (default). If conflicting with legacy CSS, consider scoping or disabling selectively.

## React Forms (API mode)

- Component: `src/components/forms/FormRenderer.tsx` (react-hook-form + zod, API submit via TanStack Query + Axios).
- Provider: Wrap mounts in `QueryClientProvider` using `src/lib/queryClient.ts`.
- HTTP: Axios instance is configured in `src/lib/http.ts` with CSRF and DRF error normalization.
- Mount contract (example in Django template):

    ```html
    <div
        id="grant-form-root"
        data-api-endpoint="/companies/grants/"
        data-company="{{ company.uuid }}"
        data-action="{{ request.path }}"
        data-csrf="{{ csrf_token }}"
        data-fields='[{"name":"name","label":"Name","type":"text","required":true}]'
        data-initial="{}"
        data-cancel="{{ request.GET.next|default:'/' }}"
    ></div>
    ```

    - Page id: set `{% block body_id %}_grant-create{% endblock %}` to load the page module.
    - Behavior: On success, redirects to `data-cancel` or `?next=`. DRF field errors are shown inline; `non_field_errors` become a top-level error.

## Deal Assessment (v2)

- Page: `src/pages/deal_assessment.tsx`, mounted on `body#_deal-assessment` into `#deal-assessment-root`.
- API: Uses `/api/deals/assessments/` to create or update the latest assessment for a deal, and `/api/deals/deals/{uuid}/` to toggle `sent_to_affinity`.
- Choices: Quality percentile options are currently hardcoded in the frontend for speed (Most interesting/Top 1%, Very interesting/Top 5%, etc.). Plan to centralize via a small choices endpoint later.
- HTTP rule: Use axios (`http` from `src/lib/http.ts`) for all network calls instead of `fetch` to keep consistent error handling and CSRF behavior.
- Validation: Async validation hooks exist in `src/lib/asyncValidation.ts`, but deal assessment async validation is handled elsewhere and not implemented here.

### Async Validation Support (2025)

FormRenderer now supports real-time async validation with TanStack Query:

#### Field Configuration

```json
{
    "name": "username",
    "label": "Username",
    "type": "text",
    "required": true,
    "asyncValidation": {
        "endpoint": "/api/validate/username/",
        "method": "POST",
        "debounceMs": 500,
        "validateOn": "change",
        "dependencies": ["company"]
    }
}
```

#### Backend Validation Endpoint

Create Django views that return validation responses:

```python
# views.py
class ValidateUsernameView(APIView):
    def post(self, request):
        username = request.data.get('value')
        if User.objects.filter(username=username).exists():
            return Response({'isValid': False, 'error': 'Username already taken'})
        return Response({'isValid': True})
```

#### Async Validation Rules

- **endpoint**: Validation API endpoint (required)
- **method**: 'GET' or 'POST' (default: 'POST')
- **debounceMs**: Debounce delay in milliseconds (default: 500)
- **validateOn**: 'change', 'blur', 'submit', or 'all' (default: 'all')
- **dependencies**: Array of other field names that trigger re-validation
- **enabled**: Boolean to conditionally enable validation
- **transformPayload**: Custom function to transform validation request
- **extractError**: Custom function to extract error from response
- **cacheKey**: Custom cache key generation function

#### Features

- **Real-time validation** with debouncing
- **Smart caching** via TanStack Query (30s stale time, 5min cache)
- **Loading indicators** and error states
- **Dependent field validation** (e.g., validate email format based on selected domain)
- **Form submission blocking** while validation is pending
- **CSRF token handling** for Django integration
- **Error normalization** for consistent UX

#### UI Components

- `ValidationIndicator`: Shows loading/error/success states
- `InlineValidation`: Positioned validation feedback
- `ValidationSummary`: Form-level validation overview
- `ValidatedFieldWrapper`: Complete field with integrated validation

#### Advanced Usage

```typescript
// Custom validation configuration
const asyncValidationConfig = {
  defaultDebounceMs: 300,
  validateOnChange: true,
  validateOnBlur: true,
  endpointPrefix: '/api/v1/validate'
};

// Multi-field dependent validation
{
  "name": "subdomain",
  "asyncValidation": {
    "endpoint": "/api/validate/subdomain/",
    "dependencies": ["domain", "company"],
    "validateOn": "blur"
  }
}
```

#### Performance Considerations

- Validation results cached for 30 seconds
- Automatic request cancellation on rapid changes
- Dependencies trigger immediate re-validation
- Failed validations don't retry automatically
- Background validation doesn't block UI interaction

## Deal Detail — Refresh UX (T-0304)

- Module: `src/pages/deal_detail.tsx`, mounted on `body#_deal-detail` into `#deal-detail-root`.
- Behavior: A top row shows “Last status” and a “Refresh Data” button.
    - On click, POSTs to `/deals/<uuid>/refresh/` (uses a small local CSRF helper) and polls `/deals/<uuid>/processing-status/` with exponential backoff (0.5s → cap 5s, up to 8 attempts).
    - When ready, re-fetches the deal, decks, and papers; the button/status row remains visible and stable to avoid flashing. Only the content panels update.
    - On timeout, shows a non-blocking amber warning.
- Loading Strategy: Full-page skeleton only on first load; re-fetches keep stale content visible (panels may show small inline loaders).
- Note on HTTP: This page uses `fetch` for small server actions to avoid pulling axios into the entry; the broader codebase standardizes on Axios via `src/lib/http.ts`.

## Library Integration (Epic 6)

- Component: `src/components/library/RelatedDocumentsPanel.tsx` renders a Tailwind UI list of library files related to a company.
- API: `/api/library/files/?company=<uuid>&page=<n>&page_size=<m>&source=<uuid>` and `/api/library/sources/`.
- Usage:
    - Deal Detail adds a panel titled "Related Documents" using `RelatedDocumentsPanel` with `paramPrefix="dl_"` so its URL state doesn't collide with other sections.
    - Company Detail already includes a library panel (Bootstrap-styled) and remains unchanged.
- URL Params: `${prefix}page`, `${prefix}size`, `${prefix}all`, `${prefix}source` (Deal uses `dl_` prefix).
- UX: Shows source filter, pagination (Prev/Next), and a range label (e.g., "Showing 1–10 of 42"). Links open in a new tab.

## Navigation Loading Overlay (Aug 2025)

### Problem Addressed
Navigation between React pages showed brief content flash as Django templates loaded before React components mounted. Users experienced jarring flashes of unstyled content during the ~100-200ms gap.

### Technical Solution
**File**: `templates/includes/loading_overlay_complete.html`

Implemented a full-screen loading overlay that:
- **Covers navigation flash**: Professional spinner overlay prevents any flash visibility
- **Perfect timing**: All code inline (HTML + CSS + JavaScript) for zero loading delays
- **React awareness**: Monitors React root elements and removes overlay when components mount
- **Smooth UX**: Elegant fade-out transition when React takes over

### Critical Architecture Decisions

**Why Inline Code is Required**:
- External CSS files create loading delays that allow flash through
- Template includes have microsecond delays that can expose flash
- External JavaScript loads too late to prevent initial flash
- **Key insight**: For timing-critical UX, inline code is the correct technical choice

### Frontend Integration Points

The overlay monitors these React mounting points in `main.tsx`:
```typescript
const roots = ['deals-dashboard-root', 'deals-fresh-root', 'deal-detail-root', 'du-dashboard-root'];
```

**Detection Logic**:
- Polls every 50ms for React components with children
- Triggers smooth opacity fade-out when React content detected
- Removes overlay after 300ms transition completes

### Performance Impact
- **Zero delay**: Overlay appears instantly on navigation
- **Minimal overhead**: Simple polling logic with automatic cleanup
- **Smooth transitions**: Users see professional loading instead of content flash
- **No React deps**: Works independently of React loading state

### Usage
Include in base templates where navigation flash could occur:
```html
{% include 'includes/loading_overlay_complete.html' %}
```

**Critical**: Never extract code from this file - the inline approach is required for perfect timing.

## Research Agent (Frontend-only)

The Research Agent is a frontend-only dashboard that analyzes research papers and teams. It is implemented as a React island loaded via the single-entry router and rendered from a minimal Django shell template. No backend logic or APIs are required to view the page; it uses mock data.

### URL & Template

- URL: `/research-agent/` (project-level route in `brain/brain/urls.py`)
- Template shell: `brain/templates/research/agent.html`
  - Sets `body id="_research-agent"` to trigger lazy-loading of the page module
  - Mount point: `<div id="research-agent-root"></div>`

### Page Registration

- Router: `assets/src/main.tsx`
  - Added `'_research-agent': () => import('./pages/research_agent')`

### Files Added

- Page module:
  - `assets/src/pages/research_agent.tsx`: mounts `ResearchAgentApp` into `#research-agent-root`.
- Components:
  - `assets/src/components/research/FeaturedAnalysis.tsx` (Card + ScrollArea + Markdown)
  - `assets/src/components/research/TeamAnalysis.tsx` (Card + ScrollArea + Markdown)
  - `assets/src/components/research/PapersList.tsx` (list of papers, citations, external links, expandable markdown evaluation)
  - `assets/src/components/research/TeamMembersList.tsx` (list of members, expandable analysis)
- Common:
  - `assets/src/components/common/Markdown.tsx` (minimal, safe markdown: H1/H2/H3, `- ` bullets, `**bold**`, `[text](url)`)
- UI helpers:
  - `assets/src/components/ui/scroll-area.tsx` (simple overflow container)
  - `assets/src/components/ui/collapsible.tsx` (lightweight wrappers; triggers use Button ghost variant)
- Mocks:
  - `assets/src/lib/mocks/research_agent.ts` (research analysis, papers, team analysis, team members)

### Design & Guidelines Alignment

- Layout: top grid with Featured Analysis (xl:col-span-2) and Team Analysis; bottom grid with Papers and Team Members (xl:2 columns).
- Borders: lists use `divide-y divide-border` per design tokens; no per-item hard-coded border colors.
- Cards: rely on shadcn `Card` (`border`, `shadow-sm`, `bg-card`, `text-muted-foreground`).
- Accordion: `Button variant="ghost" size="sm"` as trigger with chevron that rotates (`rotate-90`) on expand, `aria-expanded` set.
- Markdown: wrapped in `prose prose-sm max-w-none`; links validated to http(s), open in new tab with external-link icon.
- Accessibility: headings maintain hierarchy; triggers carry `aria-expanded` and inherit focus-visible ring from Button.

### Sidebar Navigation

- Updated `templates/includes/sidebar_nav.html`:
  - The "Research Agent" link points to `{% url 'research-agent' %}` and highlights when `'/research-agent' in request.path`.

### Future Enhancements

- Replace mock data with APIs (e.g., `/api/research/analysis`, `/api/research/papers`, `/api/research/team`, `/api/research/members`) using `http` (axios) per repo standards.
- Optionally migrate collapsible/scroll-area to Radix primitives once dependencies are approved.
- Add filters/sorting for papers and team members if needed.

## Enhanced Research Agent (T-0407)

The Research Agent was completely redesigned with enhanced components and sophisticated data visualization patterns. This represents a major upgrade from the initial implementation.

### Enhanced Component Architecture

**Upgraded Components**:
- `MetricsHeader.tsx`: 4-column KPI summary with color-coded metric cards
- `EnhancedResearchAnalysis.tsx`: Executive summary + key insights + progressive disclosure
- `EnhancedTeamAnalysis.tsx`: Team rating system with strength categories and highlights
- `EnhancedPapersList.tsx`: Academic paper evaluation with investment implications
- `EnhancedTeamMembersList.tsx`: Individual team member profiles with ratings and analysis

### Key Design Improvements

**Investment Metrics Header**: 4-column responsive grid showcasing:
- Overall Rating (A+ with color coding)
- Investment Recommendation (Strong Buy/High confidence)
- Risk Level (Medium with risk factors)
- Market Opportunity (TAM and growth projections)

**Enhanced Research Analysis**:
- Color-coded insight system (green=positive, red=risk, blue=neutral)
- Impact badges (high/medium/low) for quick prioritization
- Executive summary in highlighted green background
- Collapsible detailed analysis with markdown support

**Enhanced Team Analysis**:
- Letter-grade rating system (A+, A, B+) with visual indicators
- Strength categories with progress-style indicators
- Highlight metrics (experience, publications, exits, patents)
- Risk factor assessment with mitigation strategies

**Enhanced Team Members**:
- Individual profile cards with avatar placeholders
- Rating badges with color-coded backgrounds
- Metrics grid (publications, patents, exits, experience percentage)
- Strengths vs. risk factors comparison
- Expandable detailed analysis per member

**Enhanced Papers List**:
- Academic paper cards with relevance/merit badges
- Citation counts and author information
- Investment implications clearly highlighted
- Enhanced evaluation with markdown support

### Technical Implementation

**File Structure**:
```
brain/assets/src/components/research/
├── MetricsHeader.tsx
├── EnhancedResearchAnalysis.tsx
├── EnhancedTeamAnalysis.tsx  
├── EnhancedPapersList.tsx
├── EnhancedTeamMembersList.tsx
└── index.ts
```

**Enhanced Mock Data**:
- `mockInvestmentMetrics`: Top-level KPIs with detailed descriptions
- `mockEnhancedResearchAnalysis`: Comprehensive analysis with insights
- `mockEnhancedTeamAnalysis`: Team evaluation with strength scoring
- `mockEnhancedPapers`: Academic papers with investment evaluation
- `mockEnhancedTeamMembers`: Individual profiles with detailed assessment

**Design System Contributions**:
- **Color System**: Green (positive), blue (neutral), orange (caution), red (risk)
- **Typography Scale**: Clear hierarchy from headers to metadata
- **Card Architecture**: Consistent spacing and shadow patterns
- **Progressive Disclosure**: Expandable sections for complex content
- **Rating Systems**: Letter grades with visual color coding

### Responsive Design

**Grid System**:
- Mobile: Stacked single-column layout
- Tablet: 2-column grid for supporting data
- Desktop: 3-column main layout (2/3 + 1/3) with 4-column metrics

**Breakpoint Strategy**:
```css
/* Mobile First */
.grid-cols-1

/* Tablet (768px+) */
.md:grid-cols-2

/* Desktop (1024px+) */
.lg:grid-cols-3
.lg:grid-cols-4
```

### Performance & Accessibility

**Performance Features**:
- Progressive loading with expandable sections
- Component memoization for expensive calculations
- Efficient state management with local UI state
- Icon tree shaking for optimal bundle size

**Accessibility Features**:
- Semantic HTML structure with proper headings
- ARIA attributes for interactive elements
- Keyboard navigation support
- Screen reader compatible content
- High contrast color combinations

### Integration with Design System

The enhanced Research Agent establishes patterns that extend across the platform:
- **Metric Cards**: Reusable for other dashboard pages
- **Progressive Disclosure**: Complex content display pattern
- **Rating Systems**: Evaluation interfaces across the app
- **Profile Cards**: People-focused page patterns
- **Academic Citations**: Research/library page integration

This implementation demonstrates sophisticated React architecture for complex analytical interfaces while maintaining the clean, professional aesthetic established in the broader design system.
### Deal Detail (`deal_detail.tsx` — Redesign)

- Layout: Clean summary header (SSR) followed by a two-column assessments row and the existing Decks/Papers row.
- Assessments:
  - AI Assessment: read-only; displays auto fields from the latest `DealAssessment` (`auto_investment_rationale`, `auto_pros`, `auto_cons`, `auto_quality_percentile`).
  - Analyst (Final): inline-editable; mirrors AI layout; allows editing `investment_rationale`, `pros`, `cons`, and selecting a recommendation via `quality_percentile` (options: Not/Potentially/Interesting/Very/Most interesting → Top 50/20/10/5/1%).
- API:
  - Read: `GET /api/deals/assessments/?deal=<uuid>&ordering=-created_at&page_size=1`.
  - Write: `POST /api/deals/assessments/` or `PATCH /api/deals/assessments/{uuid}/` with `{ deal, investment_rationale, pros, cons, quality_percentile }`.
- UI: Uses shadcn/ui `Button` for subtle Edit/Save/Cancel; otherwise Tailwind utility classes for textareas/selects.
- Simplifications: Removed the former Refresh Data control to align with the spec (no top-right actions).

## File Management System (T-0801 - Aug 2025)

### Overview
Complete file management system with sophisticated upload workflows, state management, and bulk operations. Represents a major architectural advancement in the frontend codebase.

### Component Architecture

#### Core Components
- **FileManager** (`components/file-manager/FileManager.tsx`): Main orchestrator with mode-based rendering
- **FileUpload** (`components/file-manager/FileUpload.tsx`): Drag-and-drop interface with validation
- **FileTable** (`components/file-manager/FileTable.tsx`): Advanced table with TanStack integration
- **FileMetadataForm** (`components/file-manager/FileMetadataForm.tsx`): Form with React Hook Form + Zod

#### Supporting Components
- **FileActionsMenu** (`components/file-manager/FileActionsMenu.tsx`): Context actions with status awareness
- **BulkMetadataDialog** (`components/file-manager/BulkMetadataDialog.tsx`): Batch metadata editing
- **BulkDeleteConfirmDialog** (`components/file-manager/BulkDeleteConfirmDialog.tsx`): Safe bulk deletion
- **InlineEditCell** (`components/file-manager/InlineEditCell.tsx`): Table cell editing with Popover

### API Integration Layer

#### Hook Architecture
```typescript
// Draft Deal Operations
useDraftDeals() {
  createDraftDeal, updateDraftDeal, uploadDraftFile, 
  finalizeDraftDeal, getDraftDeal, deleteDraftDeal
}

// File Management Operations  
useFileManagement() {
  // Deal files
  getDealFiles, uploadDealFile, updateDealFile, 
  deleteDealFile, reprocessDealFile,
  
  // Library files  
  getLibraryFiles, uploadLibraryFile, updateLibraryFile,
  deleteLibraryFile, reprocessLibraryFile,
  
  // Bulk operations
  bulkDeleteFiles, bulkUpdateFiles, bulkReprocessFiles,
  downloadFile, subscribeToFileUpdates
}

// Draft Persistence
useDraftPersistence() {
  saveDraft, loadDraft, deleteDraft, scheduleAutoSave,
  getAllDrafts, clearAllDrafts, checkForConflicts
}
```

### Three-Mode Architecture

#### 1. Draft Deal Mode (`draft-deal`)
**Purpose**: Stage files before deal submission  
**Features**:
- Multi-file upload with validation
- Per-file metadata configuration
- Auto-save to localStorage
- Conflict detection across tabs
- Draft recovery on page reload
- Finalization workflow

**User Flow**:
1. Upload files → Metadata configuration → Submit for underwriting
2. Auto-save preserves state every 30 seconds
3. Draft finalization creates live deal

#### 2. Existing Deal Mode (`existing-deal`)  
**Purpose**: Manage files for live deals  
**Features**:
- View existing files in advanced table
- Upload additional files
- Bulk operations (delete, update, reprocess)
- Inline metadata editing
- File download with proper naming

#### 3. Library Mode (`library`)
**Purpose**: General knowledge base file management  
**Features**:
- Upload files to library  
- Same advanced table and bulk operations
- Library-specific metadata (is_public, source)

### Advanced Table Implementation

#### TanStack Table Features
- **Row Selection**: Checkbox-based with bulk actions
- **Sorting**: Column-based with visual indicators  
- **Filtering**: Global search with debouncing
- **Pagination**: Page-based with size controls
- **Inline Editing**: Popover-based cell editing

#### Table Architecture
```typescript
const table = useReactTable({
  data: files,
  columns: [
    selectColumn,      // Checkbox selection
    nameColumn,        // File name with status
    categoryColumn,    // Inline editable
    typeColumn,        // File type badge
    sizeColumn,        // Formatted file size
    statusColumn,      // Processing status
    actionsColumn      // Context menu
  ],
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onRowSelectionChange: setRowSelection
});
```

### Drag-and-Drop Upload System

#### Validation Pipeline
- **File Type**: Configurable allowed extensions
- **File Size**: Per-file and total size limits  
- **Duplicate Detection**: Name + size combination checking
- **Count Limits**: Mode-specific file count restrictions

#### Upload Process
```typescript
interface UploadFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  category?: string;
  documentType?: string;
  proprietary?: boolean;
  tldr?: string;
  tags?: string[];
  error?: string;
}
```

### Form Validation Architecture

#### Zod Schema Integration
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

#### Real-time Validation
- **Debounced validation** (300ms) for responsive UX
- **Field-level error display** with inline messages
- **Form-level validation** before submission
- **Custom validation rules** for business logic

### State Management System

#### Draft Persistence Architecture
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

#### localStorage Strategy
- **Auto-save**: Every 30 seconds with change detection
- **Conflict Resolution**: Version-based collision detection
- **Recovery**: Unsaved draft discovery on page load
- **Expiration**: 7-day automatic cleanup
- **Multi-tab Safety**: Cross-tab state synchronization

### Bulk Operations Framework

#### Operation Types
- **Bulk Delete**: Multi-file deletion with safety confirmations
- **Bulk Update**: Metadata changes across selected files
- **Bulk Reprocess**: Processing trigger for multiple files

#### Safety Features
- **Preview Mode**: Show affected files before action
- **Undo Support**: Where technically feasible
- **Progress Tracking**: Visual progress for long operations
- **Error Handling**: Per-file error reporting

### Error Handling & Recovery

#### Upload Error Recovery
- **Per-file retry**: Individual file reupload capability
- **Partial success**: Handle mixed success/failure scenarios
- **Network resilience**: Automatic retry with exponential backoff
- **User guidance**: Actionable error messages

#### Validation Error Display
- **Inline field errors**: Form field level validation
- **Summary errors**: Form-level error aggregation  
- **Real-time feedback**: Immediate validation response
- **Accessibility**: Screen reader compatible error announcements

### Performance Optimizations

#### Client-Side Performance
- **Virtual scrolling**: For large file lists
- **Debounced operations**: Search, validation, auto-save
- **Request batching**: Minimize API calls
- **Optimistic updates**: Immediate UI feedback

#### Memory Management
- **File object cleanup**: Prevent memory leaks
- **Component unmounting**: Proper cleanup on navigation
- **Cache management**: TanStack Query cache invalidation
- **State cleanup**: localStorage management

### Integration Points

#### API Endpoint Integration
- **Draft Deals**: `/api/deals/draft_deals/`
- **Deal Files**: `/api/deals/deal_files/`  
- **Library Files**: `/api/library/files/`
- **Bulk Operations**: `/api/*/bulk_*` endpoints

#### Form Integration
- **React Hook Form**: Form state management
- **Zod Validation**: Schema-based validation
- **shadcn/ui**: Consistent component library
- **TanStack Query**: Server state management

### Design System Contributions

#### UI Patterns Established
- **Multi-mode components**: Single component, multiple workflows
- **Progressive disclosure**: Tabbed interfaces for complex workflows
- **Bulk action patterns**: Selection → Action → Confirmation flow
- **Inline editing**: Popover-based editing paradigm

#### Styling Conventions
- **shadow-sm**: Replaced borders throughout system
- **Consistent spacing**: Tailwind spacing scale
- **Color semantics**: Status-based color coding
- **Loading states**: Skeleton and spinner patterns

### Testing Considerations

#### Component Testing Areas
- **File validation logic**: Upload restrictions and error handling
- **Form validation**: Zod schema compliance
- **Table interactions**: Sorting, filtering, selection
- **Bulk operations**: Multi-file action flows

#### Integration Testing Areas  
- **API integration**: Hook behavior and error handling
- **State persistence**: localStorage operations
- **Cross-tab behavior**: Conflict detection and resolution
- **Upload workflows**: End-to-end file processing

### Future Enhancement Opportunities

#### Real-time Features
- **WebSocket integration**: Live processing status updates
- **Collaborative editing**: Multi-user file management
- **Live notifications**: Cross-tab update notifications

#### Advanced Features
- **File versioning**: Track file changes over time
- **Advanced search**: Content-based file search
- **Batch import**: CSV/JSON based file imports
- **Export capabilities**: Bulk file download as ZIP

## Changelog — Aug 2025

- **File Management System**: Complete architectural implementation with three-mode workflow support
- **TanStack Table Integration**: Advanced table with row selection, bulk operations, and inline editing
- **Draft Persistence System**: localStorage-based auto-save with conflict detection and recovery
- **Form Validation Framework**: React Hook Form + Zod with real-time validation and error handling
- **Bulk Operations Framework**: Comprehensive multi-file management with safety features and progress tracking
- **Performance Optimizations**: Virtual scrolling, debounced operations, and memory management
- **Design System Extensions**: shadow-sm styling, consistent spacing, and progressive disclosure patterns
- Implemented Deal Detail redesign (AI + Analyst assessments) and removed header actions.
- Backed by serializer updates exposing AI `auto_*` fields; write pipeline supports `recommendation` and `quality_percentile`.
- Dev seeding utilities:
  - `manage.py create_dummy_deal [--count N]` creates deals with real PDFs so panels render realistic data.
  - `manage.py import_figma_deal <json>` imports a deal from a Figma-style export file.
