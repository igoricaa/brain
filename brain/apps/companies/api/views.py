from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination

from ..models import (
    Advisor,
    ClinicalStudy,
    Company,
    CompanyAdvisor,
    Founder,
    Founding,
    FundingStage,
    FundingType,
    Grant,
    Industry,
    InvestorType,
    IPOStatus,
    PatentApplication,
    TechnologyType,
)
from .filters import (
    AdvisorFilter,
    ClinicalStudyFilter,
    FounderFilter,
    FundingStageFilter,
    FundingTypeFilter,
    GrantFilter,
    IndustryFilter,
    InvestorTypeFilter,
    IPOStatusFilter,
    PatentApplicationFilter,
    TechnologyTypeFilter,
)
from .serializers import (
    AdvisorSerializer,
    ClinicalStudySerializer,
    CompanyCreateSerializer,
    CompanyListSerializer,
    FounderSerializer,
    FundingStageSerializer,
    FundingTypeSerializer,
    GrantSerializer,
    IndustrySerializer,
    InvestorTypeSerializer,
    IPOStatusSerializer,
    PatentApplicationSerializer,
    TechnologyTypeSerializer,
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
    create=extend_schema(
        summary=_('Create Company'),
        description=_('Add a new company.'),
    ),
)
class CompanyViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):

    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    action_serializers = {
        "list": CompanyListSerializer,
        "retrieve": CompanyListSerializer,
        "create": CompanyCreateSerializer,
    }

    def get_serializer_class(self):
        return self.action_serializers.get(self.action, CompanyListSerializer)

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
            Prefetch('company_advisors', queryset=CompanyAdvisor.objects.select_related('company')),
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
class FounderViewSet(viewsets.ModelViewSet):

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
class GrantViewSet(viewsets.ModelViewSet):

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


@extend_schema_view(
    list=extend_schema(
        summary=_('List IPO Statuses'),
        description=_('Retrieve a list of IPO statuses.'),
    ),
    retrieve=extend_schema(
        summary=_('Get IPO Status'),
        description=_('Retrieve details of a specific IPO status.'),
    ),
)
class IPOStatusViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = IPOStatusSerializer
    filterset_class = IPOStatusFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return IPOStatus.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Investor Types'),
        description=_('Retrieve a list of investor types.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Investor Type'),
        description=_('Retrieve details of a specific investor type.'),
    ),
)
class InvestorTypeViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = InvestorTypeSerializer
    filterset_class = InvestorTypeFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return InvestorType.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Funding Types'),
        description=_('Retrieve a list of funding types.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Funding Type'),
        description=_('Retrieve details of a specific funding type.'),
    ),
)
class FundingTypeViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = FundingTypeSerializer
    filterset_class = FundingTypeFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return FundingType.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Funding Stages'),
        description=_('Retrieve a list of funding stages.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Funding Stage'),
        description=_('Retrieve details of a specific funding stage.'),
    ),
)
class FundingStageViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = FundingStageSerializer
    filterset_class = FundingStageFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return FundingStage.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Technology Types'),
        description=_('Retrieve a list of technology types.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Technology Type'),
        description=_('Retrieve details of a specific technology type.'),
    ),
)
class TechnologyTypeViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = TechnologyTypeSerializer
    filterset_class = TechnologyTypeFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return TechnologyType.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Industries'),
        description=_('Retrieve a list of industries.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Industry'),
        description=_('Retrieve details of a specific industry.'),
    ),
)
class IndustryViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = IndustrySerializer
    filterset_class = IndustryFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return Industry.objects.all()
