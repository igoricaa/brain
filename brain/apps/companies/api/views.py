from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets

from ..models import Advisor, ClinicalStudy, Company, CompanyAdvisor, Founder, Founding, Grant, PatentApplication
from .filters import AdvisorFilter, ClinicalStudyFilter, FounderFilter, GrantFilter, PatentApplicationFilter
from .serializers import (
    AdvisorSerializer,
    ClinicalStudySerializer,
    CompanySerializer,
    FounderSerializer,
    GrantSerializer,
    PatentApplicationSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary=_('List Companies'),
        description=_('Retrieve a list of companies.'),
    ),
    retrieve=extend_schema(
        summary=_('Company Details'),
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
        return Company.objects.select_related(
            'technology_type',
            'ipo_status',
            'funding_stage',
            'last_funding_type',
            'last_equity_funding_type',
        ).prefetch_related(
            'industries',
            'investor_types',
            'investment_stages',
            Prefetch('foundings', queryset=Founding.objects.select_related('founder')),
        )


@extend_schema_view(
    list=extend_schema(
        summary=_('List Founders'),
        description=_('Retrieve a list of founders.'),
    ),
    retrieve=extend_schema(
        summary=_('Founder Details'),
        description=_('Retrieve details of a specific founder.'),
    ),
)
class FounderViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = FounderSerializer
    filterset_class = FounderFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Founder.objects.prefetch_related(
            Prefetch('foundings', queryset=Founding.objects.select_related('company')),
        )


@extend_schema_view(
    list=extend_schema(
        summary=_('List Advisors'),
        description=_('Retrieve a list of advisors.'),
    ),
    retrieve=extend_schema(
        summary=_('Advisor Details'),
        description=_('Retrieve details of a specific advisor.'),
    ),
)
class AdvisorViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = AdvisorSerializer
    filterset_class = AdvisorFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Advisor.objects.prefetch_related(
            Prefetch('company_advisors', queryset=CompanyAdvisor.objects.select_related('company')),
        )


@extend_schema_view(
    list=extend_schema(
        summary=_('List Grants'),
        description=_('Retrieve a list of grants.'),
    ),
    retrieve=extend_schema(
        summary=_('Grant Details'),
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
        summary=_('Clinical Study Details'),
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
        summary=_('Patent Application Details'),
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
