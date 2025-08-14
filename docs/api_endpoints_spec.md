# API Endpoints Specification

## Deal Management API Endpoints

### Base URL
```
/api/deals/
```

---

## 1. Search and Filter Enhancement

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