# Backend Requirements for Deal Management System

## Executive Summary

This document outlines the missing backend features required to complete the Deal Management System as specified in the product requirements. The frontend implementation is complete and waiting for these backend capabilities. The requirements are organized by priority level (HIGH, MEDIUM, LOW) with clear implementation timelines, code examples, and dependencies.

### Current State Verification
Based on codebase analysis as of 2025-08-14:
- ✅ **DealStatus enum**: Contains only NEW, ACTIVE, SUBCOMMITTEE_VETTING (missing ARCHIVED)
- ✅ **Deal.send_to_affinity method**: Exists in models but has no API endpoint
- ✅ **DealFilter**: Missing 'q' parameter for text search functionality
- ✅ **Processing pipelines**: Basic structure exists, automation not implemented

### Completed Features
- Deal and DraftDeal models with proper management
- Basic CRUD operations for deals, files, and assessments
- File upload endpoints (decks, papers, files)
- Draft workflow with finalization endpoint
- Assessment model with PRD-aligned fields
- Company relationship management
- Processing status tracking

### Partially Implemented
- Deal status enum (missing 'archived' status)
- Affinity integration (model method exists, no API endpoint)
- Assessment fields (structure exists, no automation)
- File processing (basic structure, no OCR/cleaning pipeline)

### Not Started
- Text search functionality for deals
- Send-to-affinity API endpoint
- Reassessment trigger endpoint
- Archive functionality
- Bulk operations
- OCR and text extraction pipeline
- Document cleaning automation
- Assessment automation pipeline
- Research agent integration

---

## 🔴 HIGH PRIORITY REQUIREMENTS (Week 1-2)

Critical for core functionality - must be implemented immediately.

### 1. Add Search Functionality to DealFilter

**Current State**: No text search capability in DealFilter  
**Required**: Add 'q' parameter for searching across deal and company names  
**Implementation Time**: 4-6 hours

#### Implementation Code

```python
# In brain/apps/deals/api/filters.py

from django.db.models import Q
from django_filters import rest_framework as filters

class DealFilter(filters.FilterSet):
    # ... existing fields ...
    
    q = filters.CharFilter(
        method='search_filter',
        help_text=_('Search deals by name, description, or company name')
    )
    
    def search_filter(self, queryset, name, value):
        """
        Search filter for deal and company names.
        Performs case-insensitive search across multiple fields.
        """
        if not value:
            return queryset
        
        return queryset.filter(
            Q(name__icontains=value) |
            Q(description__icontains=value) |
            Q(company__name__icontains=value)
        ).distinct()
    
    class Meta:
        model = Deal
        fields = [
            'company',
            'file', 
            'status',
            'q',  # Add to fields list
        ]
```

#### API Usage Example
```http
GET /api/deals/deals/?q=quantum
```

### 2. Add 'archived' Status to DealStatus Enum

**Current State**: Missing 'archived' status in DealStatus choices  
**Required**: Add ARCHIVED to enum and create migration  
**Implementation Time**: 2-4 hours

#### Model Update

```python
# In brain/apps/deals/models/base.py

class DealStatus(models.TextChoices):
    NEW = 'new', _('new')
    ACTIVE = 'active', _('active')
    SUBCOMMITTEE_VETTING = 'subcommittee vetting', _('subcommittee vetting')
    ARCHIVED = 'archived', _('archived')  # ADD THIS
```

#### Database Migration

```python
# apps/deals/migrations/0031_add_archived_status.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('deals', '0030_add_deck_raw_text'),
    ]
    
    operations = [
        migrations.AlterField(
            model_name='deal',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'new'),
                    ('active', 'active'),
                    ('subcommittee vetting', 'subcommittee vetting'),
                    ('archived', 'archived')  # New status
                ],
                default='new',
                max_length=64,
                blank=True
            ),
        ),
        migrations.AddField(
            model_name='deal',
            name='archived_at',
            field=models.DateTimeField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name='deal',
            name='archive_reason',
            field=models.TextField(blank=True),
        ),
    ]
```

### 3. Create Send-to-Affinity API Endpoint

**Current State**: Model method exists but no API endpoint  
**Required**: REST API action for deal operations  
**Implementation Time**: 6-8 hours

#### Implementation Code

```python
# In brain/apps/deals/api/views.py

from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

class DealViewSet(ModelViewSet):
    # ... existing code ...
    
    @extend_schema(
        summary=_('Send Deal to Affinity'),
        description=_('Send deal information to Affinity CRM and update status.'),
        request=None,  # No request body needed
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'},
                    'affinity_organization_id': {'type': 'integer', 'nullable': True},
                    'details': {'type': 'object'}
                }
            },
            400: {'description': 'Bad request'},
            404: {'description': 'Deal not found'},
            500: {'description': 'Affinity API error'}
        }
    )
    @action(methods=['post'], detail=True, url_path='send-to-affinity')
    def send_to_affinity(self, request, uuid=None):
        """Send deal to Affinity CRM."""
        deal = self.get_object()
        
        # Validate deal state
        if deal.sent_to_affinity:
            return Response(
                {'success': False, 'message': 'Deal already sent to Affinity'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not deal.company:
            return Response(
                {'success': False, 'message': 'Deal must have a company before sending to Affinity'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Call existing model method
            result = deal.send_to_affinity()
            
            # Update status if successful
            if deal.sent_to_affinity:
                if deal.status == DealStatus.NEW:
                    deal.status = DealStatus.ACTIVE
                    deal.save(update_fields=['status', 'updated_at'])
            
            return Response({
                'success': True,
                'message': 'Deal successfully sent to Affinity',
                'affinity_organization_id': deal.affinity_organization_id,
                'details': result
            })
            
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

#### Request Example
```bash
curl -X POST https://api.example.com/api/deals/deals/123e4567-e89b-12d3-a456-426614174000/send-to-affinity/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Create Reassessment API Endpoint

**Current State**: No reassessment trigger endpoint  
**Required**: Trigger assessment pipeline via API  
**Implementation Time**: 8-12 hours

#### Implementation Code

```python
# In brain/apps/deals/api/views.py

from apps.deals.tasks import assess_deal
from django.utils import timezone

@extend_schema(
    summary=_('Reassess Deal'),
    description=_('Trigger reassessment of deal with latest data.'),
    request={
        'type': 'object',
        'properties': {
            'force': {
                'type': 'boolean',
                'description': 'Force reassessment even if recently assessed',
                'default': False
            },
            'priority': {
                'type': 'string',
                'enum': ['normal', 'high', 'low'],
                'description': 'Processing priority',
                'default': 'normal'
            }
        }
    },
    responses={
        202: {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'message': {'type': 'string'},
                'task_id': {'type': 'string'},
                'processing_status': {'type': 'string'},
                'estimated_completion': {'type': 'string', 'format': 'date-time'},
                'queue_position': {'type': 'integer'}
            }
        }
    }
)
@action(methods=['post'], detail=True, url_path='reassess')
def reassess(self, request, uuid=None):
    """Trigger deal reassessment."""
    deal = self.get_object()
    force = request.data.get('force', False)
    priority = request.data.get('priority', 'normal')
    
    # Check if recently assessed (within 1 hour)
    if not force and deal.last_assessment:
        time_since = timezone.now() - deal.last_assessment.created_at
        if time_since.total_seconds() < 3600:
            return Response(
                {
                    'success': False,
                    'message': 'Deal was recently assessed. Use force=true to reassess.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Check if all files are processed
    if not deal.is_ready:
        return Response(
            {
                'success': False,
                'message': 'Cannot reassess: files still processing'
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Trigger assessment task with priority
    if priority == 'high':
        task = assess_deal.apply_async(args=[deal.id], priority=9)
    elif priority == 'low':
        task = assess_deal.apply_async(args=[deal.id], priority=1)
    else:
        task = assess_deal.delay(deal.id)
    
    # Update processing status
    deal.processing_status = ProcessingStatus.PENDING
    deal.save(update_fields=['processing_status', 'updated_at'])
    
    # Estimate completion time (based on queue length)
    queue_length = get_queue_length('assessment')
    estimated_completion = timezone.now() + timedelta(minutes=queue_length * 2)
    
    return Response(
        {
            'success': True,
            'message': 'Reassessment initiated',
            'task_id': task.id,
            'processing_status': deal.processing_status,
            'estimated_completion': estimated_completion.isoformat(),
            'queue_position': queue_length + 1
        },
        status=status.HTTP_202_ACCEPTED
    )
```

### 5. Create Archive API Endpoint

**Current State**: No archive functionality  
**Required**: Soft delete or status change to archive deals  
**Implementation Time**: 4-6 hours

#### Implementation Code

```python
# In brain/apps/deals/api/views.py

@extend_schema(
    summary=_('Archive Deal'),
    description=_('Archive a deal (soft delete).'),
    request={
        'type': 'object',
        'properties': {
            'reason': {
                'type': 'string',
                'description': 'Optional reason for archiving',
                'required': False
            },
            'notify_team': {
                'type': 'boolean',
                'description': 'Notify team members',
                'default': False
            }
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'message': {'type': 'string'},
                'previous_status': {'type': 'string'},
                'archived_at': {'type': 'string', 'format': 'date-time'}
            }
        }
    }
)
@action(methods=['post'], detail=True, url_path='archive')
def archive(self, request, uuid=None):
    """Archive a deal."""
    deal = self.get_object()
    
    # Check if already archived
    if deal.status == DealStatus.ARCHIVED:
        return Response(
            {'success': False, 'message': 'Deal is already archived'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Store previous status for audit
    previous_status = deal.status
    
    # Archive the deal
    deal.status = DealStatus.ARCHIVED
    deal.archived_at = timezone.now()
    deal.archive_reason = request.data.get('reason', '')
    deal.save(update_fields=['status', 'archived_at', 'archive_reason', 'updated_at'])
    
    # Optional: Send notifications
    if request.data.get('notify_team', False):
        notify_team_of_archive.delay(deal.id, request.user.id)
    
    # Log the action for audit trail
    AuditLog.objects.create(
        action='deal_archived',
        deal=deal,
        user=request.user,
        metadata={
            'previous_status': previous_status,
            'reason': deal.archive_reason
        }
    )
    
    return Response({
        'success': True,
        'message': 'Deal archived successfully',
        'previous_status': previous_status,
        'archived_at': deal.archived_at.isoformat()
    })

@action(methods=['post'], detail=True, url_path='unarchive')
def unarchive(self, request, uuid=None):
    """Unarchive a deal."""
    deal = self.get_object()
    
    if deal.status != DealStatus.ARCHIVED:
        return Response(
            {'success': False, 'message': 'Deal is not archived'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Restore to NEW status by default
    deal.status = DealStatus.NEW
    deal.archived_at = None
    deal.archive_reason = ''
    deal.save(update_fields=['status', 'archived_at', 'archive_reason', 'updated_at'])
    
    return Response({
        'success': True,
        'message': 'Deal unarchived successfully',
        'new_status': deal.status
    })
```

---

## 🟡 MEDIUM PRIORITY REQUIREMENTS (Week 3-4)

Features enhancing functionality and automation.

### 6. Assessment Automation Pipeline

**Current State**: Manual assessment only  
**Required**: Automated assessment pipeline with AI integration  
**Implementation Time**: 3-4 days

#### Core Assessment Task

```python
# In brain/apps/deals/tasks.py

from celery import shared_task
from brain.apps.deals.models import Deal, DealAssessment
from django.utils import timezone
from datetime import timedelta

@shared_task(bind=True, max_retries=3)
def assess_deal(self, deal_id):
    """Automated assessment pipeline with token management."""
    try:
        deal = Deal.objects.get(id=deal_id)
        
        # Check for recent assessment
        recent = DealAssessment.objects.filter(
            deal=deal,
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).exists()
        
        if recent:
            return {"status": "skipped", "reason": "Recent assessment exists"}
        
        # 1. Build context (max 50k tokens)
        context, context_tokens = build_assessment_context(deal, max_tokens=50000)
        
        # 2. Calculate token budget for RAG
        rag_budget = min(50000 - context_tokens, 10000)
        
        # 3. Run RAG if budget allows
        if rag_budget >= 2000:
            rag_results = run_vector_search(deal, rag_budget)
            context += f"\n\n=== KNOWLEDGE BASE RESULTS ===\n{rag_results}"
            context_tokens = count_tokens(context)
        
        # 4. Call AI for assessment
        from aindex.vertexai import DealAssistant
        assistant = DealAssistant()
        
        # Add assessment instructions
        prompt = f"{context}\n\n=== INSTRUCTIONS ===\n{get_assessment_prompt()}"
        assessment_data = assistant.assess(prompt)
        
        # 5. Create/update assessment
        assessment, created = DealAssessment.objects.update_or_create(
            deal=deal,
            defaults={
                'quality_percentile': assessment_data.get('quality_percentile'),
                'recommendation': assessment_data.get('recommendation'),
                'auto_recommendation': assessment_data.get('recommendation'),
                'problem_solved': assessment_data.get('problem_solved'),
                'solution_description': assessment_data.get('solution_description'),
                'tam': assessment_data.get('tam'),
                'market_description': assessment_data.get('market_description'),
                'technical_rating': assessment_data.get('technical_rating'),
                'team_rating': assessment_data.get('team_rating'),
                'traction_rating': assessment_data.get('traction_rating'),
                'assessment_context': context[:10000],  # Store truncated
                'tokens_used': context_tokens,
                'automated': True,
                'created_at': timezone.now()
            }
        )
        
        # Update deal processing status
        deal.processing_status = ProcessingStatus.COMPLETED
        deal.save(update_fields=['processing_status', 'updated_at'])
        
        return {
            "status": "success",
            "assessment_id": str(assessment.uuid),
            "tokens_used": context_tokens
        }
        
    except Exception as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

def build_assessment_context(deal, max_tokens=50000):
    """Build optimized context for assessment."""
    context_parts = []
    current_tokens = 0
    
    # Priority order for context inclusion
    priority_sources = [
        ('company_info', lambda: serialize_company(deal.company)),
        ('pitch_deck', lambda: get_cleaned_deck_text(deal)),
        ('previous_assessment', lambda: get_previous_assessment_delta(deal)),
        ('affinity_notes', lambda: get_affinity_notes(deal)),
        ('research_analysis', lambda: get_research_agent_output(deal)),
        ('founders', lambda: get_founders_data(deal)),
        ('grants', lambda: get_grants_summary(deal)),
        ('patents', lambda: get_patents_summary(deal)),
        ('clinical_trials', lambda: get_clinical_trials(deal)),
        ('academic_papers', lambda: get_papers_summary(deal)),
        ('other_files', lambda: get_other_files_text(deal))
    ]
    
    for source_name, source_func in priority_sources:
        try:
            source_text = source_func()
            if not source_text:
                continue
                
            source_tokens = count_tokens(source_text)
            
            if current_tokens + source_tokens <= max_tokens:
                context_parts.append(f"=== {source_name.upper()} ===\n{source_text}")
                current_tokens += source_tokens
            else:
                # Truncate if needed
                remaining = max_tokens - current_tokens
                if remaining > 1000:  # Only add if meaningful
                    truncated = truncate_to_tokens(source_text, remaining)
                    context_parts.append(f"=== {source_name.upper()} (TRUNCATED) ===\n{truncated}")
                    current_tokens += remaining
                break
        except Exception as e:
            logger.warning(f"Failed to get {source_name}: {e}")
            continue
    
    return '\n\n'.join(context_parts), current_tokens
```

### 7. Bulk Operations Support

**Current State**: No bulk endpoints  
**Required**: Bulk delete, status update, and Affinity sync  
**Implementation Time**: 2-3 days

#### Bulk Operations Endpoint

```python
# In brain/apps/deals/api/views.py

@extend_schema(
    summary=_('Bulk Operations'),
    description=_('Perform bulk operations on multiple deals.'),
    request={
        'type': 'object',
        'required': ['action', 'deal_ids'],
        'properties': {
            'action': {
                'type': 'string',
                'enum': ['archive', 'unarchive', 'send_to_affinity', 'update_status', 'delete'],
                'description': 'Action to perform'
            },
            'deal_ids': {
                'type': 'array',
                'items': {'type': 'string', 'format': 'uuid'},
                'maxItems': 100,  # Prevent DOS
                'description': 'List of deal UUIDs'
            },
            'status': {
                'type': 'string',
                'enum': ['new', 'active', 'subcommittee vetting', 'archived'],
                'description': 'New status (required for update_status action)'
            },
            'soft_delete': {
                'type': 'boolean',
                'description': 'Use soft delete instead of hard delete',
                'default': True
            }
        }
    }
)
@action(methods=['post'], detail=False, url_path='bulk')
def bulk_operations(self, request):
    """Perform bulk operations on deals."""
    action = request.data.get('action')
    deal_ids = request.data.get('deal_ids', [])
    
    if not action or not deal_ids:
        return Response(
            {'success': False, 'message': 'action and deal_ids are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate UUIDs
    try:
        deal_uuids = [uuid.UUID(str(id)) for id in deal_ids]
    except ValueError:
        return Response(
            {'success': False, 'message': 'Invalid UUID format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Limit batch size
    if len(deal_uuids) > 100:
        return Response(
            {'success': False, 'message': 'Maximum 100 deals per batch'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get deals with optimized query
    deals = Deal.objects.filter(uuid__in=deal_uuids).select_related('company')
    
    results = []
    processed = 0
    failed = 0
    
    # Process each deal
    for deal in deals:
        try:
            if action == 'archive':
                if deal.status != DealStatus.ARCHIVED:
                    deal.status = DealStatus.ARCHIVED
                    deal.archived_at = timezone.now()
                    deal.save(update_fields=['status', 'archived_at', 'updated_at'])
                    processed += 1
                results.append({'deal_id': str(deal.uuid), 'success': True})
                
            elif action == 'unarchive':
                if deal.status == DealStatus.ARCHIVED:
                    deal.status = DealStatus.NEW
                    deal.archived_at = None
                    deal.save(update_fields=['status', 'archived_at', 'updated_at'])
                    processed += 1
                results.append({'deal_id': str(deal.uuid), 'success': True})
                
            elif action == 'send_to_affinity':
                if not deal.sent_to_affinity and deal.company:
                    result = deal.send_to_affinity()
                    if deal.status == DealStatus.NEW:
                        deal.status = DealStatus.ACTIVE
                        deal.save(update_fields=['status', 'updated_at'])
                    processed += 1
                results.append({'deal_id': str(deal.uuid), 'success': True})
                
            elif action == 'update_status':
                new_status = request.data.get('status')
                if not new_status:
                    raise ValueError('status is required for update_status action')
                deal.status = new_status
                deal.save(update_fields=['status', 'updated_at'])
                processed += 1
                results.append({'deal_id': str(deal.uuid), 'success': True})
                
            elif action == 'delete':
                if request.data.get('soft_delete', True):
                    deal.deleted_at = timezone.now()
                    deal.save(update_fields=['deleted_at'])
                else:
                    deal.delete()
                processed += 1
                results.append({'deal_id': str(deal.uuid), 'success': True})
                
            else:
                raise ValueError(f'Unknown action: {action}')
                
        except Exception as e:
            failed += 1
            results.append({
                'deal_id': str(deal.uuid),
                'success': False,
                'error': str(e)
            })
    
    # Handle missing deals
    found_uuids = set(str(d.uuid) for d in deals)
    for uuid_str in deal_ids:
        if uuid_str not in found_uuids:
            failed += 1
            results.append({
                'deal_id': uuid_str,
                'success': False,
                'error': 'Deal not found'
            })
    
    return Response({
        'success': failed == 0,
        'message': f'Processed {processed} deals, {failed} failed',
        'processed': processed,
        'failed': failed,
        'results': results
    })
```

### 8. OCR and Text Extraction Pipeline

**Current State**: No automated text extraction  
**Required**: Extract text from PDFs and documents  
**Implementation Time**: 2-3 days

#### Text Extraction Task

```python
# In brain/apps/deals/tasks.py

@shared_task(bind=True, max_retries=3)
def extract_text_from_file(self, file_uuid):
    """Extract text from uploaded file with OCR support."""
    try:
        from apps.deals.models import DealFile
        file_obj = DealFile.objects.get(uuid=file_uuid)
        
        # Update status
        file_obj.processing_status = ProcessingStatus.PROCESSING
        file_obj.save(update_fields=['processing_status'])
        
        # Extract based on file type
        file_path = file_obj.file.path
        file_type = file_obj.file_type.lower()
        
        if 'pdf' in file_type:
            text = extract_pdf_text(file_path)
        elif file_type.startswith('image/'):
            text = extract_image_text_ocr(file_path)
        elif 'word' in file_type or 'docx' in file_type:
            text = extract_docx_text(file_path)
        elif 'text' in file_type:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        # Save raw text
        file_obj.raw_text = text
        file_obj.raw_text_extracted_at = timezone.now()
        file_obj.processing_status = ProcessingStatus.TEXT_EXTRACTED
        file_obj.save(update_fields=['raw_text', 'raw_text_extracted_at', 'processing_status'])
        
        # Trigger cleaning step
        clean_file_text.delay(str(file_uuid))
        
        return {"status": "success", "characters": len(text)}
        
    except Exception as e:
        file_obj.processing_status = ProcessingStatus.FAILED
        file_obj.processing_error = str(e)
        file_obj.save(update_fields=['processing_status', 'processing_error'])
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

def extract_pdf_text(file_path):
    """Extract text from PDF using PyPDF2 with fallback to OCR."""
    import PyPDF2
    from pdf2image import convert_from_path
    import pytesseract
    
    text_parts = []
    
    try:
        # Try text extraction first
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                if text and len(text.strip()) > 50:  # Meaningful text
                    text_parts.append(text)
                else:
                    # Fall back to OCR for this page
                    images = convert_from_path(file_path, first_page=page_num+1, last_page=page_num+1)
                    for image in images:
                        ocr_text = pytesseract.image_to_string(image)
                        text_parts.append(ocr_text)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        # Full OCR fallback
        images = convert_from_path(file_path)
        for image in images:
            text_parts.append(pytesseract.image_to_string(image))
    
    return '\n\n'.join(text_parts)
```

### 9. Document Cleaning Pipeline

**Current State**: No text cleaning/optimization  
**Required**: Token reduction for efficient AI processing  
**Implementation Time**: 2-3 days

#### Cleaning Task

```python
# In brain/apps/deals/tasks.py

@shared_task
def clean_file_text(file_uuid):
    """Clean and optimize extracted text based on document type."""
    from apps.deals.models import DealFile
    file_obj = DealFile.objects.get(uuid=file_uuid)
    raw_text = file_obj.raw_text
    
    if not raw_text:
        return {"status": "skipped", "reason": "No raw text"}
    
    # Determine cleaning strategy based on category and token count
    token_count = count_tokens(raw_text)
    category = file_obj.category
    
    if category == 'deck' and token_count > 5000:
        # Aggressive cleaning for pitch decks
        cleaned = clean_pitch_deck(raw_text, target_reduction=0.6)
    elif category == 'paper':
        # Preserve academic content
        cleaned = clean_academic_paper(raw_text, target_reduction=0.3)
    else:
        # Standard cleaning
        cleaned = standard_clean(raw_text, target_reduction=0.4)
    
    # Save cleaned text
    file_obj.cleaned_text = cleaned
    file_obj.cleaned_text_tokens = count_tokens(cleaned)
    file_obj.processing_status = ProcessingStatus.CLEANED
    file_obj.save(update_fields=['cleaned_text', 'cleaned_text_tokens', 'processing_status'])
    
    # Calculate reduction
    reduction_pct = (1 - len(cleaned) / len(raw_text)) * 100
    
    # Trigger entity extraction
    extract_entities.delay(str(file_uuid))
    
    return {
        "status": "success",
        "original_tokens": token_count,
        "cleaned_tokens": file_obj.cleaned_text_tokens,
        "reduction_percentage": reduction_pct
    }

def clean_pitch_deck(text, target_reduction=0.6):
    """Aggressive cleaning for pitch decks."""
    import re
    
    # Remove common boilerplate sections
    boilerplate_patterns = [
        r'(?i)disclaimer.*?(?=\n\n|\Z)',
        r'(?i)safe harbor.*?(?=\n\n|\Z)',
        r'(?i)confidential.*?(?=\n\n|\Z)',
        r'(?i)copyright.*?(?=\n\n|\Z)',
    ]
    
    for pattern in boilerplate_patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # Remove headers/footers
    text = re.sub(r'^.*?page \d+.*?$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+$', '', text, flags=re.MULTILINE)
    
    # Compress bullet points
    lines = text.split('\n')
    compressed_lines = []
    bullet_buffer = []
    
    for line in lines:
        if re.match(r'^\s*[•·▪▫◦‣⁃]\s+', line):
            bullet_buffer.append(line.strip())
            if len(bullet_buffer) >= 5:
                # Summarize long bullet lists
                summary = summarize_bullets(bullet_buffer)
                compressed_lines.append(summary)
                bullet_buffer = []
        else:
            if bullet_buffer:
                compressed_lines.extend(bullet_buffer)
                bullet_buffer = []
            compressed_lines.append(line)
    
    text = '\n'.join(compressed_lines)
    
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()

def clean_academic_paper(text, target_reduction=0.3):
    """Preserve important academic content while removing redundancy."""
    import re
    
    # Identify sections
    sections = {
        'abstract': extract_section(text, r'(?i)abstract', r'(?i)introduction|\d\.\s'),
        'methodology': extract_section(text, r'(?i)method', r'(?i)results|\d\.\s'),
        'results': extract_section(text, r'(?i)results', r'(?i)discussion|\d\.\s'),
        'conclusion': extract_section(text, r'(?i)conclusion', r'(?i)references|\Z'),
    }
    
    # Keep important sections, summarize others
    cleaned_parts = []
    
    for section_name, section_text in sections.items():
        if section_text:
            if section_name in ['abstract', 'results', 'conclusion']:
                cleaned_parts.append(f"=== {section_name.upper()} ===\n{section_text}")
            else:
                # Summarize verbose sections
                summary = summarize_text(section_text, max_tokens=500)
                cleaned_parts.append(f"=== {section_name.upper()} (SUMMARY) ===\n{summary}")
    
    # Remove references section entirely
    text = re.sub(r'(?i)references.*', '', text, flags=re.DOTALL)
    
    return '\n\n'.join(cleaned_parts)
```

### 10. Soft Delete Implementation

**Current State**: No soft delete capability  
**Required**: Preserve data while hiding from views  
**Implementation Time**: 1-2 days

#### Model Enhancement

```python
# In brain/apps/deals/models/deals.py

class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default."""
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)
    
    def all_with_deleted(self):
        """Include soft-deleted records."""
        return super().get_queryset()
    
    def deleted_only(self):
        """Only soft-deleted records."""
        return super().get_queryset().filter(deleted_at__isnull=False)

class Deal(models.Model):
    # ... existing fields ...
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_deals'
    )
    
    # Managers
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Includes deleted
    
    def delete(self, soft=True, user=None):
        """Override delete to use soft delete by default."""
        if soft:
            self.deleted_at = timezone.now()
            self.deleted_by = user
            self.save(update_fields=['deleted_at', 'deleted_by'])
        else:
            super().delete()
    
    def restore(self):
        """Restore a soft-deleted deal."""
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['deleted_at', 'deleted_by'])
```

---

## 🟢 LOW PRIORITY REQUIREMENTS (Week 5-6)

Nice-to-have features for enhanced functionality.

### 11. Analytics Endpoints

**Current State**: No analytics API  
**Required**: Deal metrics and statistics  
**Implementation Time**: 2-3 days

```python
# In brain/apps/deals/api/views.py

from django.db.models import Count, Q, Avg, Sum
from datetime import timedelta

@action(detail=False, methods=['get'], url_path='analytics')
def analytics(self, request):
    """Deal analytics and metrics."""
    # Time range filter
    days = int(request.query_params.get('days', 30))
    since = timezone.now() - timedelta(days=days)
    
    # Basic counts
    total_deals = Deal.objects.count()
    active_deals = Deal.objects.filter(status=DealStatus.ACTIVE).count()
    
    # Status distribution
    by_status = Deal.objects.values('status').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Recent activity
    recent_deals = Deal.objects.filter(created_at__gte=since).count()
    recent_assessments = DealAssessment.objects.filter(created_at__gte=since).count()
    
    # Assessment metrics
    assessment_stats = DealAssessment.objects.aggregate(
        avg_quality=Avg('quality_percentile'),
        total_strong_yes=Count('id', filter=Q(recommendation='strong_yes')),
        total_yes=Count('id', filter=Q(recommendation='yes')),
        total_no=Count('id', filter=Q(recommendation='no')),
    )
    
    # Processing metrics
    processing_stats = Deal.objects.aggregate(
        pending=Count('id', filter=Q(processing_status=ProcessingStatus.PENDING)),
        processing=Count('id', filter=Q(processing_status=ProcessingStatus.PROCESSING)),
        completed=Count('id', filter=Q(processing_status=ProcessingStatus.COMPLETED)),
        failed=Count('id', filter=Q(processing_status=ProcessingStatus.FAILED)),
    )
    
    # Affinity sync metrics
    affinity_stats = Deal.objects.aggregate(
        sent_to_affinity=Count('id', filter=Q(sent_to_affinity=True)),
        pending_affinity=Count('id', filter=Q(sent_to_affinity=False, status=DealStatus.ACTIVE)),
    )
    
    return Response({
        'summary': {
            'total_deals': total_deals,
            'active_deals': active_deals,
            'archived_deals': Deal.objects.filter(status=DealStatus.ARCHIVED).count(),
            'draft_deals': DraftDeal.objects.count(),
        },
        'by_status': list(by_status),
        'recent_activity': {
            f'deals_created_{days}d': recent_deals,
            f'assessments_{days}d': recent_assessments,
            'sent_to_affinity_7d': Deal.objects.filter(
                sent_to_affinity=True,
                updated_at__gte=timezone.now() - timedelta(days=7)
            ).count(),
        },
        'assessment_metrics': assessment_stats,
        'processing_metrics': processing_stats,
        'affinity_metrics': affinity_stats,
        'generated_at': timezone.now().isoformat(),
    })
```

### 12. WebSocket Support for Real-time Updates

**Current State**: No real-time updates  
**Required**: Live processing status and notifications  
**Implementation Time**: 3-4 days

```python
# In brain/apps/deals/consumers.py

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class DealConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for real-time deal updates."""
    
    async def connect(self):
        self.deal_uuid = self.scope['url_route']['kwargs']['deal_uuid']
        self.deal_group_name = f'deal_{self.deal_uuid}'
        
        # Join deal group
        await self.channel_layer.group_add(
            self.deal_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial status
        deal_status = await self.get_deal_status()
        await self.send_json({
            'type': 'status_update',
            'status': deal_status
        })
    
    async def disconnect(self, close_code):
        # Leave deal group
        await self.channel_layer.group_discard(
            self.deal_group_name,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """Handle incoming WebSocket messages."""
        message_type = content.get('type')
        
        if message_type == 'subscribe_updates':
            # Subscribe to specific update types
            await self.subscribe_to_updates(content.get('updates', []))
        
    async def deal_update(self, event):
        """Handle deal update messages from channel layer."""
        await self.send_json({
            'type': 'deal_update',
            'update_type': event['update_type'],
            'data': event['data']
        })
    
    @database_sync_to_async
    def get_deal_status(self):
        """Get current deal status."""
        from apps.deals.models import Deal
        try:
            deal = Deal.objects.get(uuid=self.deal_uuid)
            return {
                'processing_status': deal.processing_status,
                'status': deal.status,
                'sent_to_affinity': deal.sent_to_affinity,
                'has_assessment': deal.assessments.exists(),
            }
        except Deal.DoesNotExist:
            return None
```

### 13. Export Functionality

**Current State**: No export capabilities  
**Required**: CSV/Excel export for deals  
**Implementation Time**: 2 days

```python
# In brain/apps/deals/api/views.py

import csv
from django.http import HttpResponse
import openpyxl
from io import BytesIO

@action(detail=False, methods=['get'], url_path='export')
def export(self, request):
    """Export deals to CSV or Excel."""
    format = request.query_params.get('format', 'csv').lower()
    
    # Apply filters from query params
    queryset = self.filter_queryset(self.get_queryset())
    
    # Select related for efficiency
    queryset = queryset.select_related(
        'company', 'funding_stage', 'funding_type'
    ).prefetch_related(
        'industries', 'assessments'
    )
    
    if format == 'csv':
        return self.export_csv(queryset)
    elif format == 'excel':
        return self.export_excel(queryset)
    else:
        return Response(
            {'error': 'Invalid format. Use csv or excel.'},
            status=status.HTTP_400_BAD_REQUEST
        )

def export_csv(self, queryset):
    """Export deals to CSV."""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="deals_{timezone.now().date()}.csv"'
    
    writer = csv.writer(response)
    
    # Header
    writer.writerow([
        'Deal Name', 'Company', 'Status', 'Created Date',
        'Quality Percentile', 'Recommendation', 'Sent to Affinity',
        'Industries', 'Funding Stage', 'Website'
    ])
    
    # Data rows
    for deal in queryset:
        assessment = deal.assessments.first()
        writer.writerow([
            deal.name,
            deal.company.name if deal.company else '',
            deal.status,
            deal.created_at.date(),
            assessment.quality_percentile if assessment else '',
            assessment.recommendation if assessment else '',
            'Yes' if deal.sent_to_affinity else 'No',
            ', '.join(i.name for i in deal.industries.all()),
            deal.funding_stage.name if deal.funding_stage else '',
            deal.company.website if deal.company else ''
        ])
    
    return response

def export_excel(self, queryset):
    """Export deals to Excel."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Deals'
    
    # Header
    headers = [
        'Deal Name', 'Company', 'Status', 'Created Date',
        'Quality Percentile', 'Recommendation', 'Sent to Affinity',
        'Industries', 'Funding Stage', 'Website'
    ]
    ws.append(headers)
    
    # Style header row
    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
        cell.fill = openpyxl.styles.PatternFill(
            start_color='E0E0E0',
            end_color='E0E0E0',
            fill_type='solid'
        )
    
    # Data rows
    for deal in queryset:
        assessment = deal.assessments.first()
        ws.append([
            deal.name,
            deal.company.name if deal.company else '',
            deal.status,
            deal.created_at.date(),
            assessment.quality_percentile if assessment else '',
            assessment.recommendation if assessment else '',
            'Yes' if deal.sent_to_affinity else 'No',
            ', '.join(i.name for i in deal.industries.all()),
            deal.funding_stage.name if deal.funding_stage else '',
            deal.company.website if deal.company else ''
        ])
    
    # Adjust column widths
    for column in ws.columns:
        max_length = max(len(str(cell.value)) for cell in column if cell.value)
        ws.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    response = HttpResponse(
        excel_file.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="deals_{timezone.now().date()}.xlsx"'
    
    return response
```

---

## Database Optimizations

### Required Indexes

Add these indexes for optimal performance:

```sql
-- Text search index for deals
CREATE INDEX deals_deal_search_idx ON deals_deal 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Company name search
CREATE INDEX companies_company_name_trgm_idx ON companies_company 
USING gin(name gin_trgm_ops);

-- Soft delete index
CREATE INDEX deals_deal_deleted_at_idx ON deals_deal(deleted_at) 
WHERE deleted_at IS NULL;

-- Status and date filtering
CREATE INDEX deals_deal_status_created_idx ON deals_deal(status, created_at DESC);

-- Processing status
CREATE INDEX deals_deal_processing_status_idx ON deals_deal(processing_status) 
WHERE processing_status != 'completed';

-- Affinity sync
CREATE INDEX deals_deal_affinity_pending_idx ON deals_deal(sent_to_affinity) 
WHERE sent_to_affinity = false AND status = 'active';
```

---

## Testing Requirements

### Unit Tests

```python
# apps/deals/tests/test_api.py

from rest_framework.test import APITestCase
from unittest.mock import patch, Mock
from apps.deals.models import Deal, DealStatus

class DealActionTests(APITestCase):
    
    def setUp(self):
        self.user = User.objects.create_user('test@example.com')
        self.client.force_authenticate(user=self.user)
        self.company = Company.objects.create(name='Test Co')
        self.deal = Deal.objects.create(
            name='Test Deal',
            status=DealStatus.NEW,
            company=self.company
        )
    
    def test_search_filter(self):
        """Test text search functionality."""
        response = self.client.get('/api/deals/deals/?q=test')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Deal')
    
    def test_send_to_affinity_success(self):
        """Test successful send to Affinity."""
        with patch.object(Deal, 'send_to_affinity') as mock_send:
            mock_send.return_value = {'id': 123}
            
            response = self.client.post(
                f'/api/deals/deals/{self.deal.uuid}/send-to-affinity/'
            )
            
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data['success'])
            mock_send.assert_called_once()
    
    def test_reassess_triggers_task(self):
        """Test reassessment triggers background task."""
        with patch('apps.deals.tasks.assess_deal.delay') as mock_task:
            mock_task.return_value = Mock(id='task-123')
            
            response = self.client.post(
                f'/api/deals/deals/{self.deal.uuid}/reassess/'
            )
            
            self.assertEqual(response.status_code, 202)
            self.assertEqual(response.data['task_id'], 'task-123')
            mock_task.assert_called_once_with(self.deal.id)
    
    def test_archive_deal(self):
        """Test archiving a deal."""
        response = self.client.post(
            f'/api/deals/deals/{self.deal.uuid}/archive/',
            {'reason': 'Test archive'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.status, DealStatus.ARCHIVED)
        self.assertIsNotNone(self.deal.archived_at)
        self.assertEqual(self.deal.archive_reason, 'Test archive')
    
    def test_bulk_operations(self):
        """Test bulk archive operation."""
        deals = [
            Deal.objects.create(name=f'Deal {i}', status=DealStatus.NEW)
            for i in range(3)
        ]
        
        response = self.client.post(
            '/api/deals/deals/bulk/',
            {
                'action': 'archive',
                'deal_ids': [str(d.uuid) for d in deals]
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['processed'], 3)
        
        for deal in deals:
            deal.refresh_from_db()
            self.assertEqual(deal.status, DealStatus.ARCHIVED)
```

### Integration Tests

```python
class DealWorkflowTests(APITestCase):
    
    def test_complete_deal_workflow(self):
        """Test complete deal lifecycle from creation to archive."""
        # 1. Create draft
        draft_response = self.client.post('/api/deals/drafts/', {
            'name': 'Integration Test Deal',
            'description': 'Testing complete workflow'
        })
        self.assertEqual(draft_response.status_code, 201)
        draft_uuid = draft_response.data['uuid']
        
        # 2. Upload file
        with open('test_deck.pdf', 'rb') as f:
            file_response = self.client.post('/api/deals/files/', {
                'deal': draft_uuid,
                'file': f,
                'category': 'deck'
            })
        self.assertEqual(file_response.status_code, 201)
        
        # 3. Finalize draft
        finalize_response = self.client.post(
            f'/api/deals/drafts/{draft_uuid}/finalize/'
        )
        self.assertEqual(finalize_response.status_code, 200)
        
        # 4. Send to Affinity
        with patch.object(Deal, 'send_to_affinity') as mock_send:
            mock_send.return_value = {'id': 123}
            affinity_response = self.client.post(
                f'/api/deals/deals/{draft_uuid}/send-to-affinity/'
            )
            self.assertEqual(affinity_response.status_code, 200)
        
        # 5. Trigger reassessment
        with patch('apps.deals.tasks.assess_deal.delay') as mock_assess:
            reassess_response = self.client.post(
                f'/api/deals/deals/{draft_uuid}/reassess/'
            )
            self.assertEqual(reassess_response.status_code, 202)
        
        # 6. Archive
        archive_response = self.client.post(
            f'/api/deals/deals/{draft_uuid}/archive/'
        )
        self.assertEqual(archive_response.status_code, 200)
        
        # Verify final state
        deal = Deal.objects.get(uuid=draft_uuid)
        self.assertEqual(deal.status, DealStatus.ARCHIVED)
        self.assertTrue(deal.sent_to_affinity)
```

---

## Environment Variables

Add to `.env.example`:

```bash
# Affinity Integration
AFFINITY_API_KEY=your_key_here
AFFINITY_LIST_ID=your_list_id

# Assessment Settings
MAX_ASSESSMENT_TOKENS=50000
RAG_MIN_BUDGET=2000
DEFAULT_RAG_BUDGET=10000

# Processing Settings
OCR_ENABLED=true
MAX_FILE_SIZE_MB=50
SUPPORTED_FILE_TYPES=pdf,doc,docx,txt,png,jpg,jpeg

# Cleaning Thresholds
DECK_TOKEN_THRESHOLD=5000
PAPER_TOKEN_THRESHOLD=10000

# Search Settings
SEARCH_RESULT_LIMIT=50
ENABLE_FUZZY_SEARCH=true

# Batch Processing
ASSESSMENT_BATCH_SIZE=10
BULK_OPERATION_LIMIT=100

# Cache Settings
TEXT_CACHE_TTL=86400
EMBEDDING_CACHE_TTL=604800

# WebSocket Settings (if implemented)
CHANNEL_LAYERS_BACKEND=redis
CHANNEL_LAYERS_HOST=localhost
CHANNEL_LAYERS_PORT=6379
```

---

## Migration Plan

### Phase 1: Core Features (Week 1-2)
1. **Day 1-2**: Database changes
   - Add archived status to DealStatus enum
   - Create and run migrations
   - Add soft delete fields

2. **Day 3-4**: Search implementation
   - Add 'q' parameter to DealFilter
   - Implement search method
   - Add database indexes

3. **Day 5-7**: API endpoints
   - Send-to-affinity endpoint
   - Reassess endpoint
   - Archive/unarchive endpoints

4. **Day 8-10**: Testing and documentation
   - Unit tests for all endpoints
   - Integration tests
   - Update API documentation

### Phase 2: Processing Pipelines (Week 3-4)
1. **Day 11-13**: OCR pipeline
   - Text extraction from PDFs
   - OCR for images
   - Document format handlers

2. **Day 14-16**: Cleaning rules
   - Pitch deck optimization
   - Academic paper handling
   - Token reduction strategies

3. **Day 17-20**: Assessment automation
   - Context building
   - RAG integration
   - AI assessment calls

4. **Day 21-22**: Integration testing
   - End-to-end pipeline tests
   - Performance benchmarks

### Phase 3: Enhancement Features (Week 5-6)
1. **Day 23-25**: Bulk operations
   - Bulk status updates
   - Bulk assessments
   - Batch processing

2. **Day 26-28**: Analytics and export
   - Analytics endpoints
   - CSV/Excel export
   - Dashboard metrics

3. **Day 29-30**: Final testing
   - Load testing
   - Security audit
   - Deployment preparation

---

## Risk Mitigation

### Performance Risks
- **Large document processing**: Implement chunking and streaming
- **Search performance**: Use proper indexes and pagination
- **API response times**: Implement caching where appropriate
- **Concurrent updates**: Use database locks and transactions

### Data Integrity Risks
- **Failed processing**: Implement retry logic with exponential backoff
- **Data loss**: Regular backups and soft deletes
- **Duplicate data**: Implement duplicate detection

### Integration Risks
- **Affinity API limits**: Implement rate limiting and queuing
- **AI API failures**: Fallback mechanisms and error handling
- **Frontend compatibility**: Version APIs and maintain backwards compatibility

### Security Risks
- **Authentication**: Ensure all endpoints require proper authentication
- **Authorization**: Implement role-based access control
- **Input validation**: Validate all inputs with serializers
- **SQL injection**: Use ORM properly, avoid raw SQL

---

## Success Metrics

### Functional Metrics
- ✅ All HIGH priority features operational
- ✅ < 5% error rate in document processing
- ✅ < 2 second response time for search queries
- ✅ 100% backward compatibility maintained

### Quality Metrics
- ✅ 90% test coverage for new code
- ✅ All endpoints documented in OpenAPI spec
- ✅ Zero critical security vulnerabilities
- ✅ Performance benchmarks met

### Business Metrics
- ✅ 50% reduction in manual deal processing time
- ✅ 80% of deals automatically assessed within 24 hours
- ✅ 95% successful Affinity synchronization rate
- ✅ < 1% duplicate deal rate

---

## Next Steps

### Immediate Actions (This Week)
1. Review and approve requirements with stakeholders
2. Set up development environment with required services
3. Begin HIGH priority implementations
4. Create feature branches for parallel development

### Team Coordination
- Daily standups during implementation sprints
- Code reviews for all pull requests
- Frontend team sync for API contracts
- Weekly demos of completed features

### Documentation Requirements
- Update API documentation as features are added
- Create migration guides for database changes
- Document configuration requirements
- Write user guides for new features

---

## Appendices

### Related Documents
- [API Endpoints Specification](./api_endpoints_spec.md) - Detailed endpoint specifications
- [Processing Pipelines Specification](./processing_pipelines_spec.md) - Pipeline implementation details
- [TASKS_NEW.md](../TASKS_NEW.md) - Overall project status and roadmap
- [Frontend Migration Checklist](./FRONTEND_MIGRATION_CHECKLIST.md) - Frontend requirements

### Technical References
- Django REST Framework: https://www.django-rest-framework.org/
- Celery Documentation: https://docs.celeryproject.org/
- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
- Affinity API: https://api-docs.affinity.co/

### Contact Information
- Backend Team Lead: [TBD]
- Frontend Team Lead: [TBD]
- Product Owner: [TBD]
- DevOps Contact: [TBD]
- Security Team: [TBD]

---

## Acceptance Criteria Checklist

### HIGH Priority Features
- [ ] Search filter returns results from deal and company names
- [ ] Search supports partial matches and is case-insensitive
- [ ] Archived status added to DealStatus enum
- [ ] Database migration for archived status successful
- [ ] Send to Affinity action updates status and sets flag
- [ ] Send to Affinity handles errors gracefully
- [ ] Reassess action queues background task
- [ ] Reassess respects recent assessment check
- [ ] Archive action changes status to 'archived'
- [ ] Archive action sets archived_at timestamp
- [ ] Unarchive action restores deal to 'new' status

### MEDIUM Priority Features
- [ ] Assessment automation processes all deal types
- [ ] Token budget management works correctly
- [ ] RAG integration enhances assessments when budget allows
- [ ] Bulk operations process multiple deals efficiently
- [ ] Bulk operations handle partial failures gracefully
- [ ] OCR extracts text from PDFs successfully
- [ ] Text cleaning reduces tokens by target percentage
- [ ] Soft delete preserves data integrity

### LOW Priority Features
- [ ] Analytics endpoint returns accurate metrics
- [ ] Export generates valid CSV files
- [ ] Export generates valid Excel files
- [ ] WebSocket updates work in real-time

### Quality Requirements
- [ ] All endpoints have proper error handling
- [ ] All endpoints return consistent error formats
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests cover critical workflows
- [ ] API documentation updated in OpenAPI schema
- [ ] Performance benchmarks met
- [ ] Security vulnerabilities addressed