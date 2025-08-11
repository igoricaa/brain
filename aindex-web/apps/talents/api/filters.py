from django_filters import rest_framework as filters

from ..models import Founder

__all__ = ['FounderFilter']


class FounderFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid')
    deal = filters.UUIDFilter(field_name='company__deal__uuid')

    class Meta:
        model = Founder
        fields = [
            'company',
            'deal',
        ]
