# Deal Upload & File Management - Backend Ideas

This document outlines why I initially wanted to make backend changes and what we can achieve with the existing backend.

## Initial Backend Change Ideas

### 1. Model Extensions I Wanted to Add

I initially thought we needed to extend the DealFile model with:
- `file_type` - for categorizing files (Pitch Deck, Whitepaper, etc.)
- `domain` - for AI/ML, Life Sciences, etc.
- `proprietary_data` - flag for sensitive data
- `tldr` - summary field
- `clean_text` - extracted text
- `published_at` - publication date

**BUT I DISCOVERED**: The library app already has most of this!
- Categories can handle both file types AND domains
- Tags array can store "proprietary" flag
- The library File model already has most fields we need
- DealFile inherits from library.File, so it gets all these features

### 2. Missing Features That Would Still Be Nice

**File Management:**
- Bulk operations endpoint (delete multiple, update multiple)
- Duplicate detection via file hash
- TLDR generation (could store in extras JSON field)
- Clean text extraction (could also use extras field)

**Deal Runs/Versioning:**
- No support for multiple underwriting runs per deal
- Can't compare different versions of analysis

### 3. What We Can Work With

**Existing APIs we can leverage:**
- `/api/library/files/` - Full CRUD for library files
- `/api/library/categories/` - Get categories (use for domains)
- `/api/library/document-types/` - Get document types
- `/api/library/sources/` - Get sources
- `/api/deals/decks/` - Upload decks (creates Deal if needed)
- `/api/deals/files/` - Deal-specific files

**Workarounds using existing models:**
- Use Categories for both domains AND file types (with different category groups)
- Use tags array for "proprietary" flag
- Store TLDR in extras JSON field
- Use processing_status for tracking file processing

## Frontend-Only Implementation Strategy

### 1. File Upload Enhancement
- Build FileManager component that works with existing endpoints
- For multiple files: loop through and upload one by one to `/api/deals/decks/`
- Show progress for each file

### 2. File Categorization
- Fetch categories and document types from library endpoints
- Allow user to select and update via PATCH to files
- Store domain as a category with specific prefix (e.g., "domain:ai_ml")

### 3. File Management UI
- List files using `/api/deals/files/?deal={uuid}`
- Implement client-side bulk selection
- For bulk delete: loop through selected files and DELETE individually
- For bulk update: loop through and PATCH individually

### 4. Metadata Storage
- Use extras JSON field for additional metadata:
  ```json
  {
    "tldr": "2-5 sentence summary...",
    "proprietary": true,
    "published_at": "2024-01-15"
  }
  ```

### 5. Submit for Underwriting
- Create a frontend-only "Submit" flow
- Validate all files have required metadata
- Could trigger a simple POST to mark deal as ready

## Conclusion

While backend changes would make this cleaner and more efficient, we can build a fully functional file management system using the existing APIs. The main limitations are:
1. No true bulk operations (must loop client-side)
2. No built-in duplicate detection
3. No automated text extraction/TLDR generation
4. No deal run versioning

But for MVP, the existing backend is sufficient with creative frontend implementation.