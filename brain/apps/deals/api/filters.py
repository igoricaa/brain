from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import Deal, DealAssessment, DealFile, Deck, DualUseSignal, Paper

__all__ = ['DealFilter', 'DeckFilter', 'DualUseSignalFilter', 'DealAssessmentFilter', 'DealFileFilter', 'PaperFilter']


class DealFilter(filters.FilterSet):

    company = filters.UUIDFilter(field_name='company__uuid', help_text=_('filter by company UUID'))
    file = filters.UUIDFilter(field_name='file__uuid', help_text=_('filter by file UUID'))

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = Deal
        fields = [
            'company',
            'file',
            'status',
        ]


class DealAssessmentFilter(filters.FilterSet):

    deal = filters.UUIDFilter(field_name='deal__uuid', help_text=_('filter by deal UUID'))
    company = filters.UUIDFilter(field_name='deal__company__uuid', help_text=_('filter by company UUID'))

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = DealAssessment
        fields = [
            'deal',
            'company',
            'quality_percentile',
            'auto_quality_percentile',
            'recommendation',
            'auto_recommendation',
            'updated',
            'created',
        ]


class DealFileFilter(filters.FilterSet):
    deal = filters.UUIDFilter(field_name='deal__uuid', help_text=_('filter by deal UUID'))
    company = filters.UUIDFilter(field_name='deal__company__uuid', help_text=_('filter by company UUID'))

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = DealFile
        fields = ['deal', 'company', 'processing_status']


class DeckFilter(DealFileFilter):

    class Meta(DealFileFilter.Meta):
        model = Deck


class PaperFilter(DealFileFilter):

    document_type = filters.UUIDFilter(
        field_name='document_types__uuid',
        help_text=_('filter by document types UUID'),
    )

    citation_count = filters.RangeFilter(
        field_name='citation_count',
        help_text=_('filter papers by number of citations'),
    )

    class Meta(DealFileFilter.Meta):
        model = Paper


class DualUseSignalFilter(filters.FilterSet):

    category = filters.UUIDFilter(field_name='category__uuid', help_text=_('filter by deal UUID'))
    category_name = filters.CharFilter(
        field_name='category__name',
        help_text=_('filter by category name'),
        lookup_expr='iexact',
    )

    class Meta:
        model = DualUseSignal
        fields = ['category', 'category_name']
