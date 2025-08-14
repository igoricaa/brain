# API Endpoints Specification

This document outlines both **current** and **planned** API endpoints for the Bhive deal management system.

## Base URLs

- **Development**: `http://localhost:8000/api/`
- **Production**: TBD
- **OpenAPI Docs**: `http://localhost:8000/api/docs/` (ReDoc)
- **Swagger UI**: `http://localhost:8000/api/swagger-ui/`

## Authentication

All endpoints require authentication:
- **Bearer Token**: `Authorization: Bearer <token>`
- **Session**: Django session cookies (for web interface)

---

# CURRENT API ENDPOINTS

## Core Deals API

### GET /api/deals/deals/
List and search deals

**Query Parameters:**
- `page`: int (pagination)
- `page_size`: int (default 20, max 100)
- `search`: string (name/description search)
- `status`: string (`draft|active|archive`)
- `ordering`: string (e.g., `-created_at`)

**Response:**
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/deals/deals/?page=2",
  "previous": null,
  "results": [
    {
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "name": "AI Startup Deal",
      "description": "Promising AI company focused on...",
      "status": "active",
      "company": {
        "uuid": "comp-uuid-here",
        "name": "TechCorp Inc",
        "website": "https://techcorp.com"
      },
      "industries": [
        {"uuid": "ind-uuid", "name": "Artificial Intelligence"}
      ],
      "dual_use_signals": [
        {"uuid": "sig-uuid", "name": "Advanced Analytics", "code": "AA"}
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:00:00Z"
    }
  ]
}
```

### GET /api/deals/deals/{uuid}/
Get deal details

**Response:** Full Deal object with all nested relationships

### PATCH /api/deals/deals/{uuid}/
Update deal

**Body Examples:**
```json
// Update basic info
{
  "name": "New Deal Name",
  "description": "Updated description"
}

// Update industries (UUIDs array)
{
  "industries": ["industry-uuid-1", "industry-uuid-2"]
}

// Update dual-use signals (UUIDs array)
{
  "dual_use_signals": ["signal-uuid-1", "signal-uuid-2"]
}
```

### POST /api/deals/deals/
Create new deal

**Required:** `name`
**Optional:** `company` (UUID), `description`, `status`

### DELETE /api/deals/deals/{uuid}/
Soft delete deal

---

## File Management

### GET /api/deals/deal-files/
List deal files with filtering

**Query Parameters:**
- `deal`: UUID (required for filtering)
- `file_type`: string (`deck|paper|other`)
- `page_size`: int (default 20)

### POST /api/deals/deal-files/
Upload file (multipart/form-data)

**Fields:**
- `file`: File object
- `deal`: UUID
- `file_type`: string
- `name`: string (optional)

### PATCH /api/deals/deal-files/{uuid}/
Update file metadata

### DELETE /api/deals/deal-files/{uuid}/
Delete file

---

## Companies API

### GET /api/companies/companies/{uuid}/
Get company details

### GET /api/companies/companies/
List companies with search/pagination

---

## People Management

### GET /api/companies/founders/
List founders with company filter

**Query:** `?company={uuid}&page_size=50`

### POST /api/companies/founders/
Create founder relationship

**Body:**
```json
{
  "company": "company-uuid",
  "founder": {
    "name": "John Doe",
    "country": "US",
    "bio": "Former Google engineer...",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "website": "https://johndoe.com",
    "location": "San Francisco, CA"
  },
  "title": "CEO",
  "age_at_founding": 32
}
```

### DELETE /api/companies/founders/{uuid}/
Remove founder relationship

### GET /api/companies/advisors/
List advisors with company filter

### POST /api/companies/advisors/
Create advisor relationship

**Body:**
```json
{
  "company": "company-uuid",
  "advisor": {
    "name": "Jane Smith",
    "country": "US",
    "bio": "20 years experience in...",
    "linkedin_url": "https://linkedin.com/in/janesmith",
    "website": "https://janesmith.com",
    "location": "Boston, MA"
  }
}
```

### DELETE /api/companies/advisors/{uuid}/
Remove advisor relationship

---

## External Data (Read-Only)

### GET /api/companies/grants/
List government grants
**Query:** `?company={uuid}&page_size=100`

### GET /api/companies/patent-applications/
List patents
**Query:** `?company={uuid}&page_size=100`

### GET /api/companies/clinical-studies/
List clinical trials
**Query:** `?company={uuid}&page_size=100`

---

## Reference Data (Read-Only)

### GET /api/companies/industries/
List all industries (static reference data)

### GET /api/dual_use/signals/
List all dual-use signals (static reference data)

---

# PLANNED API ENHANCEMENTS

## 1. Enhanced Search and Filtering

### GET /api/deals/deals/
**Enhancement**: Add text search capability

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search text (searches name, description, company) | `q=quantum` |
| `status` | string | Filter by status | `status=active` |
| `page` | integer | Page number | `page=1` |
| `limit` | integer | Results per page (max 50) | `limit=50` |
| `company` | uuid | Filter by company UUID | `company=123e4567-e89b-12d3-a456-426614174000` |
| `created_after` | date | Filter by creation date | `created_after=2024-01-01` |
| `created_before` | date | Filter by creation date | `created_before=2024-12-31` |

#### Response
```json
{
  "count": 150,
  "next": "http://api/deals/deals/?page=2&limit=50",
  "previous": null,
  "results": [
    {
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Quantum Computing Deal",
      "status": "active",
      "company": {
        "uuid": "987fcdeb-51a2-43f1-b321-543210fedcba",
        "name": "Quantum Dynamics Inc",
        "website": "https://quantumdynamics.com"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "last_assessment_created_at": "2024-01-20T14:00:00Z",
      "sent_to_affinity": false,
      "assessment_count": 2,
      "file_count": 12,
      "founders_count": 3,
      "grants_count": 5,
      "grants_total": 2500000.00,
      "patents_count": 8,
      "clinical_trials_count": 0
    }
  ]
}
```

---

## 2. Deal Actions

### POST /api/deals/deals/{uuid}/send-to-affinity/
Send deal to Affinity CRM

#### Request
No body required

#### Response (Success)
```json
{
  "success": true,
  "affinity_id": "aff_123456",
  "message": "Deal sent to Affinity successfully",
  "deal": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "sent_to_affinity": true,
    "affinity_id": "aff_123456"
  }
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "Affinity API error: Invalid credentials",
  "code": "AFFINITY_AUTH_ERROR"
}
```

#### Status Codes
- `200` - Success
- `400` - Bad request (e.g., already sent)
- `404` - Deal not found
- `500` - Server error

---

### POST /api/deals/deals/{uuid}/reassess/
Trigger reassessment pipeline

#### Request
```json
{
  "force": false,  // Optional: Force reassessment even if recent
  "priority": "normal"  // Optional: normal, high, low
}
```

#### Response
```json
{
  "success": true,
  "task_id": "celery-task-uuid-123",
  "message": "Reassessment queued",
  "estimated_completion": "2024-01-15T11:00:00Z",
  "queue_position": 3
}
```

#### Status Codes
- `202` - Accepted (queued for processing)
- `400` - Bad request (e.g., assessment in progress)
- `404` - Deal not found

---

### POST /api/deals/deals/{uuid}/archive/
Archive a deal

#### Request
```json
{
  "reason": "Duplicate entry",  // Optional
  "notify_team": false  // Optional
}
```

#### Response
```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "status": "archived",
  "archived_at": "2024-01-15T10:45:00Z",
  "archived_by": "user-uuid",
  "archive_reason": "Duplicate entry"
}
```

#### Status Codes
- `200` - Success
- `400` - Bad request (e.g., already archived)
- `404` - Deal not found

---

## 3. Bulk Operations

### POST /api/deals/deals/bulk-delete/
Delete multiple deals

#### Request
```json
{
  "ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "987fcdeb-51a2-43f1-b321-543210fedcba"
  ],
  "soft_delete": true  // Optional, default true
}
```

#### Response
```json
{
  "success": true,
  "deleted": 2,
  "failed": 0,
  "errors": [],
  "details": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "deleted"
    },
    {
      "id": "987fcdeb-51a2-43f1-b321-543210fedcba",
      "status": "deleted"
    }
  ]
}
```

#### Status Codes
- `200` - Success (even if partial)
- `400` - Bad request (no IDs provided)

---

### POST /api/deals/deals/bulk-update/
Update multiple deals

#### Request
```json
{
  "ids": ["uuid1", "uuid2"],
  "updates": {
    "status": "active",
    "tags": ["reviewed", "priority"]
  }
}
```

#### Response
```json
{
  "success": true,
  "updated": 2,
  "failed": 0,
  "errors": []
}
```

---

## 4. Assessment Operations

### GET /api/deals/deals/{uuid}/assessment-history/
Get assessment history

#### Response
```json
{
  "count": 3,
  "results": [
    {
      "uuid": "assess-uuid-1",
      "created_at": "2024-01-20T14:00:00Z",
      "quality_percentile": 85,
      "recommendation": "strong_yes",
      "automated": true,
      "tokens_used": 45000,
      "processing_time_seconds": 12.5
    }
  ]
}
```

---

### POST /api/deals/deals/{uuid}/new-files-since-assessment/
Get files added since last assessment

#### Response
```json
{
  "last_assessment_date": "2024-01-20T14:00:00Z",
  "new_files_count": 3,
  "new_files": [
    {
      "uuid": "file-uuid-1",
      "file_name": "pitch_deck_v2.pdf",
      "created_at": "2024-01-22T10:00:00Z",
      "category": "deck",
      "size": 2500000
    }
  ]
}
```

---

## 5. Search Suggestions

### GET /api/deals/search-suggestions/
Get search suggestions (autocomplete)

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Partial search term |
| `limit` | integer | Max suggestions (default 10) |

#### Response
```json
{
  "suggestions": [
    {
      "type": "deal",
      "text": "Quantum Computing Deal",
      "uuid": "123e4567-e89b-12d3-a456-426614174000"
    },
    {
      "type": "company",
      "text": "Quantum Dynamics Inc",
      "uuid": "987fcdeb-51a2-43f1-b321-543210fedcba"
    }
  ]
}
```

---

## 6. Analytics and Metrics

### GET /api/deals/analytics/
Get deal analytics

#### Response
```json
{
  "summary": {
    "total_deals": 150,
    "active_deals": 45,
    "archived_deals": 20,
    "draft_deals": 10
  },
  "by_status": [
    {"status": "new", "count": 75},
    {"status": "active", "count": 45},
    {"status": "archived", "count": 20}
  ],
  "recent_activity": {
    "deals_created_7d": 12,
    "assessments_7d": 8,
    "sent_to_affinity_7d": 5
  },
  "assessment_metrics": {
    "average_quality_percentile": 72,
    "strong_yes_count": 15,
    "yes_count": 30,
    "no_count": 10
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "field": "field_name",  // Optional, for validation errors
    "details": {}  // Optional, additional error context
  }
}
```

### Common Error Codes
| Code | Description |
|------|-------------|
| `DEAL_NOT_FOUND` | Deal UUID not found |
| `INVALID_STATUS` | Invalid status value |
| `ALREADY_SENT` | Deal already sent to Affinity |
| `ASSESSMENT_IN_PROGRESS` | Assessment already running |
| `PERMISSION_DENIED` | User lacks permission |
| `VALIDATION_ERROR` | Input validation failed |
| `AFFINITY_API_ERROR` | Affinity integration error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Rate Limiting

- **Default**: 1000 requests per hour per user
- **Search**: 100 requests per minute
- **Bulk operations**: 10 requests per minute
- **Assessment**: 5 concurrent assessments per user

Headers returned:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642089600
```

---

## Authentication

All endpoints require authentication via:
- Bearer token: `Authorization: Bearer <token>`
- Session cookie (for web interface)

---

## Pagination

Standard pagination format:
```json
{
  "count": 150,
  "next": "http://api/endpoint/?page=2",
  "previous": "http://api/endpoint/?page=1",
  "page_size": 50,
  "total_pages": 3,
  "results": [...]
}
```

---

## Versioning

API version in header:
```
API-Version: 1.0
```

Future versions:
```
/api/v2/deals/...
```