from django_filters import rest_framework as filters

from ..models import Advisor, ClinicalStudy, Founder, Grant, PatentApplication

__all__ = ['GrantFilter', 'ClinicalStudyFilter', 'PatentApplicationFilter', 'FounderFilter', 'AdvisorFilter']


class FounderFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    class Meta:
        model = Founder
        fields = [
            'company',
            'deal',
        ]


class AdvisorFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    class Meta:
        model = Advisor
        fields = [
            'company',
            'deal',
        ]


class GrantFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    class Meta:
        model = Grant
        fields = [
            'company',
            'deal',
        ]


class ClinicalStudyFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    class Meta:
        model = ClinicalStudy
        fields = [
            'company',
            'deal',
        ]


class PatentApplicationFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

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
