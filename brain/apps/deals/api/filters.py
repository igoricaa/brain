from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import Deal, DealFile, Deck, DualUseSignal, Paper

__all__ = ['DealFilter', 'DeckFilter', 'DualUseSignalFilter', 'DealFileFilter', 'PaperFilter']


class DealFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid', help_text=_('filter by company UUID'))
    file = filters.UUIDFilter(field_name='file__uuid', help_text=_('filter by file UUID'))

    class Meta:
        model = Deal
        fields = [
            'company',
            'file',
            'status',
        ]


class DealFileFilter(filters.FilterSet):
    deal = filters.UUIDFilter(field_name='deal__uuid', help_text=_('filter by deal UUID'))
    company = filters.UUIDFilter(field_name='deal__company__uuid', help_text=_('filter by company UUID'))

    class Meta:
        model = DealFile
        fields = ['deal', 'company', 'processing_status']


class DeckFilter(DealFileFilter):

    class Meta(DealFileFilter.Meta):
        model = Deck


class PaperFilter(DealFileFilter):

    class Meta(DealFileFilter.Meta):
        model = Paper


class DualUseSignalFilter(filters.FilterSet):

    category = filters.UUIDFilter(field_name='category__uuid', help_text=_('filter by deal UUID'))
    category_name = filters.CharFilter(
        field_name='category__name', help_text=_('filter by category name'), lookup_expr='iexact'
    )

    class Meta:
        model = DualUseSignal
        fields = ['category', 'category_name']
