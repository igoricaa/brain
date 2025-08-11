from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import Deal, Deck, DualUseSignal

__all__ = ['DealFilter', 'DeckFilter', 'DualUseSignalFilter']


class DealFilter(filters.FilterSet):

    deck = filters.UUIDFilter(field_name='deck__uuid', help_text=_('filter by deck UUID'))

    class Meta:
        model = Deal
        fields = [
            'deck',
        ]


class DeckFilter(filters.FilterSet):

    deal = filters.UUIDFilter(field_name='deal__uuid', help_text=_('filter by deal UUID'))

    class Meta:
        model = Deck
        fields = [
            'deal',
        ]


class DualUseSignalFilter(filters.FilterSet):

    category = filters.UUIDFilter(field_name='category__uuid', help_text=_('category by deal UUID'))
    category_name = filters.CharFilter(
        field_name='category__name',
        help_text=_('category by category name'),
        lookup_expr='iexact'
    )

    class Meta:
        model = DualUseSignal
        fields = [
            'category',
            'category_name'
        ]
