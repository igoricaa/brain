from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import (
    Advisor,
    ClinicalStudy,
    Founder,
    FundingStage,
    FundingType,
    Grant,
    Industry,
    InvestorType,
    IPOStatus,
    PatentApplication,
    TechnologyType,
)

__all__ = [
    'GrantFilter',
    'ClinicalStudyFilter',
    'PatentApplicationFilter',
    'FounderFilter',
    'AdvisorFilter',
    'IPOStatusFilter',
    'InvestorTypeFilter',
    'FundingTypeFilter',
    'FundingStageFilter',
    'TechnologyTypeFilter',
    'IndustryFilter',
]


class FounderFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='founding__company__uuid')
    deal = filters.UUIDFilter(field_name='founding__company__deal__uuid')

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = Founder
        fields = [
            'company',
            'deal',
        ]


class AdvisorFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company_advisor__company__uuid')
    deal = filters.UUIDFilter(field_name='company_advisor__company__deal__uuid')

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = Advisor
        fields = [
            'company',
            'deal',
        ]


class GrantFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = Grant
        fields = [
            'company',
            'deal',
        ]


class ClinicalStudyFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = ClinicalStudy
        fields = [
            'company',
            'deal',
        ]


class PatentApplicationFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = PatentApplication
        fields = [
            'company',
            'deal',
            'patent_number',
            'number',
            'confirmation_number',
            'status_code',
            'type_code',
        ]


class IPOStatusFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = IPOStatus
        fields = ["name", "code"]


class InvestorTypeFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = InvestorType
        fields = ["name", "code"]


class FundingTypeFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = FundingType
        fields = ["name", "code"]


class FundingStageFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = FundingStage
        fields = ["name", "code"]


class TechnologyTypeFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = TechnologyType
        fields = ["name", "code"]


class IndustryFilter(filters.FilterSet):

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    class Meta:
        model = Industry
        fields = ["name", "code"]
