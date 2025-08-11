from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets

from ..models import ClinicalStudy, Company, Grant, PatentApplication
from .filters import ClinicalStudyFilter, GrantFilter, PatentApplicationFilter
from .serializers import ClinicalStudySerializer, CompanySerializer, GrantSerializer, PatentApplicationSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Companies'),
        description=_('Retrieve a list of companies.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Company'),
        description=_('Retrieve details of a specific company.'),
    ),
)
class CompanyViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = CompanySerializer
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Company.objects\
            .select_related(
                'technology_type',
                'ipo_status',
                'funding_stage',
                'last_funding_type',
                'last_equity_funding_type'
            )\
            .prefetch_related('industries', 'investor_types', 'investment_stages')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Grants'),
        description=_('Retrieve a list of grants.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Grant'),
        description=_('Retrieve details of a specific grant.'),
    ),
)
class GrantViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = GrantSerializer
    lookup_field = 'uuid'
    filterset_class = GrantFilter
    ordering_fields = ['created_at', 'updated_at', 'company__name', 'award_date', 'potential_amount']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Grant.objects.select_related('company')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Clinical Studies'),
        description=_('Retrieve a list of clinical studies.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Clinical Study'),
        description=_('Retrieve details of a specific clinical study.'),
    ),
)
class ClinicalStudyViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = ClinicalStudySerializer
    lookup_field = 'uuid'
    filterset_class = ClinicalStudyFilter
    ordering_fields = ['created_at', 'updated_at', 'company__name', 'start_date_str', 'completion_date_str']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return ClinicalStudy.objects.select_related('company')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Patent Applications'),
        description=_('Retrieve a list of patent applications.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Patent Application'),
        description=_('Retrieve details of a specific patent application.'),
    ),
)
class PatentApplicationViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = PatentApplicationSerializer
    lookup_field = 'uuid'
    filterset_class = PatentApplicationFilter
    ordering_fields = ['created_at', 'updated_at', 'company__name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return PatentApplication.objects.select_related('company')
