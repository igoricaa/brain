from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count, Sum
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import File, Category, Source, DocumentType


@method_decorator(login_required, name='dispatch')
class LibraryView(TemplateView):
    """
    Main library page view that serves the React application.
    """
    template_name = 'library/library.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'page_title': 'Knowledge Graph',
            'page_description': 'Comprehensive file management and knowledge base',
        })
        return context


@method_decorator(login_required, name='dispatch')
class LibraryNewView(TemplateView):
    """
    Enhanced library page view using the FileManager component with advanced features.
    """
    template_name = 'library/library-new.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'page_title': 'Enhanced Library',
            'page_description': 'Advanced file management system with AI features and enhanced functionality',
        })
        return context


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def library_stats(request):
    """
    API endpoint for library statistics.
    """
    try:
        # Basic file statistics
        total_files = File.objects.count()
        total_size = File.objects.aggregate(
            total_size=Sum('file_size')
        )['total_size'] or 0
        
        # Files by category
        files_by_category = list(
            Category.objects.annotate(
                count=Count('files')
            ).values('name', 'count').order_by('-count')[:10]
        )
        
        # Files by type (based on MIME type)
        files_by_type = list(
            File.objects.values('mime_type').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
        )
        
        # Process the MIME types to make them more readable
        type_mapping = {
            'application/pdf': 'PDF',
            'application/msword': 'Word Document',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
            'text/plain': 'Text File',
            'text/markdown': 'Markdown',
            'image/jpeg': 'JPEG Image',
            'image/png': 'PNG Image',
            'image/gif': 'GIF Image',
            'image/webp': 'WebP Image',
        }
        
        files_by_type = [
            {
                'type': type_mapping.get(item['mime_type'], item['mime_type'] or 'Unknown'),
                'count': item['count']
            }
            for item in files_by_type
        ]
        
        # Processing status
        processing_status = list(
            File.objects.values('processing_status').annotate(
                count=Count('id')
            ).order_by('-count')
        )
        
        # Recent uploads (last 7 days)
        from django.utils import timezone
        from datetime import timedelta
        
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_uploads = File.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        
        stats = {
            'total_files': total_files,
            'total_size': total_size,
            'files_by_category': files_by_category,
            'files_by_type': files_by_type,
            'processing_status': processing_status,
            'recent_uploads': recent_uploads,
        }
        
        return Response(stats)
        
    except Exception as e:
        return Response(
            {'error': 'Failed to fetch library statistics'},
            status=500
        )


# Template view function (alternative to class-based view)
@login_required
def library_view(request):
    """
    Function-based view for the library page.
    Alternative to the class-based LibraryView.
    """
    context = {
        'page_title': 'Knowledge Graph',
        'page_description': 'Comprehensive file management and knowledge base',
    }
    return render(request, 'library/library.html', context)