from django.utils.translation import gettext_lazy as _

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination

from ..models import Report
from .filters import ReportFilter
from .serializers import ReportSerializer

__all__ = ["ReportViewSet"]


@extend_schema_view(
    list=extend_schema(
        summary=_('List Reports'),
        description=_('Retrieve a list of reports.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Report'),
        description=_('Retrieve details of a specific report.'),
    ),
)
class ReportViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = ReportSerializer
    filterset_class = ReportFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['-updated_at']
    required_scopes = ['default']

    def get_queryset(self):
        # Return queryset for list view
        if self.action == 'list':
            return Report.objects.prefetch_related('industries')

        # Return queryset for detail view
        elif self.action == 'retrieve':
            return Report.objects.select_related(
                'company',
                'technology_type',
                'ipo_status',
                'funding_stage',
                'last_funding_type',
            ).prefetch_related(
                'industries',
                'investor_types',
                'investment_stages',
            )

        # fallback
        return super().get_queryset()
