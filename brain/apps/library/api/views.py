from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from ..models import Category, DocumentType, File, Paper, PaperAuthor, PaperAuthorship, Source
from .filters import FileFilter, PaperAuthorFilter, PaperFilter
from .serializers import (
    CategorySerializer,
    DocumentTypeSerializer,
    FileReadSerializer,
    FileSerializer,
    PaperAuthorSerializer,
    PaperProcessingStatusSerializer,
    PaperReadSerializer,
    PaperSerializer,
    SourceSerializer,
)

__all__ = ['FileViewSet', 'PaperViewSet', 'SourceViewSet', 'CategoryViewSet', 'DocumentTypeViewSet']


@extend_schema_view(
    list=extend_schema(
        summary=_('List Files'),
        description=_('Retrieve a list of library files.'),
        responses={200: FileReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('File Details'),
        description=_('Retrieve details of a library file.'),
        responses={200: FileReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create File'),
        description=_('Add a new library file.'),
    ),
    update=extend_schema(
        summary=_('Update File'),
        description=_('Update an existing library file.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update File'),
        description=_('Partially update an existing library file.'),
    ),
    destroy=extend_schema(
        summary=_('Delete File'),
        description=_('Delete a library file.'),
    ),
)
class FileViewSet(ModelViewSet):

    filterset_class = FileFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return FileReadSerializer
        else:
            return FileSerializer

    def get_queryset(self):
        qs = File.objects.filter(is_deleted=False)
        return qs.select_related('source').prefetch_related('categories')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Papers'),
        description=_('Retrieve a list of academic papers.'),
        responses={200: PaperReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Paper Details'),
        description=_('Retrieve details of a academic paper.'),
        responses={200: PaperReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create Paper'),
        description=_('Add a new academic paper.'),
    ),
    update=extend_schema(
        summary=_('Update Paper'),
        description=_('Update an existing academic paper.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Paper'),
        description=_('Partially update an existing academic paper.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Paper'),
        description=_('Delete an academic paper.'),
    ),
    retrieve_processing_status=extend_schema(
        summary=_('Paper Processing Status'),
        description=_('Retrieve processing status for an academic paper.'),
    ),
)
class PaperViewSet(ModelViewSet):

    filterset_class = PaperFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'title', 'citation_count']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return PaperReadSerializer
        elif self.action == 'retrieve_processing_status':
            return PaperProcessingStatusSerializer
        else:
            return PaperSerializer

    def get_queryset(self):
        qs = Paper.objects.filter(is_deleted=False)

        if self.action == 'retrieve_processing_status':
            return qs.only('uuid', 'processing_status', 'updated_at', 'polymorphic_ctype_id', 'file_ptr_id')

        return qs.select_related('source').prefetch_related('categories', 'document_types', 'authors')

    @action(
        detail=True,
        methods=['get'],
        name='Paper Processing Status.',
        url_path='processing-status',
        url_name='processing-status',
    )
    def retrieve_processing_status(self, request, *args, **kwargs):
        paper = self.get_object()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(instance=paper)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary=_('List Authors'),
        description=_('Retrieve a list of papers authors.'),
    ),
    retrieve=extend_schema(
        summary=_('Author Details'),
        description=_('Retrieve details of a specific paper author.'),
    ),
    create=extend_schema(
        summary=_('Create Author'),
        description=_('Add a new paper author.'),
    ),
    update=extend_schema(
        summary=_('Update Author'),
        description=_('Update an existing paper author.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Author'),
        description=_('Partially update an existing paper author.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Author'),
        description=_('Delete a paper author.'),
    ),
)
class PaperAuthorViewSet(ModelViewSet):

    serializer_class = PaperAuthorSerializer
    filterset_class = PaperAuthorFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return PaperAuthor.objects.prefetch_related(
            Prefetch('authorships', queryset=PaperAuthorship.objects.select_related('paper')),
        )


@extend_schema_view(
    list=extend_schema(
        summary=_('List Sources'),
        description=_('Retrieve a list of sources.'),
    ),
    retrieve=extend_schema(
        summary=_('Source Details'),
        description=_('Retrieve details of a specific source.'),
    ),
)
class SourceViewSet(ReadOnlyModelViewSet):

    serializer_class = SourceSerializer
    lookup_field = 'uuid'
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return Source.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Categories'),
        description=_('Retrieve a list of categories.'),
    ),
    retrieve=extend_schema(
        summary=_('Category Details'),
        description=_('Retrieve details of a specific category.'),
    ),
)
class CategoryViewSet(ReadOnlyModelViewSet):

    serializer_class = CategorySerializer
    lookup_field = 'uuid'
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return Category.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Document Types'),
        description=_('Retrieve a list of document types.'),
    ),
    retrieve=extend_schema(
        summary=_('Document Type Details'),
        description=_('Retrieve details of a specific document type.'),
    ),
)
class DocumentTypeViewSet(ReadOnlyModelViewSet):

    serializer_class = DocumentTypeSerializer
    lookup_field = 'uuid'
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return DocumentType.objects.all()
