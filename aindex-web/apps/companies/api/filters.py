from django_filters import rest_framework as filters

from ..models import ClinicalStudy, Grant, PatentApplication

__all__ = ['GrantFilter', 'ClinicalStudyFilter', 'PatentApplicationFilter']


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
