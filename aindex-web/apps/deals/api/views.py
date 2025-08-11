from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets

from ..models import Deal, Deck, DualUseSignal, Industry
from .filters import DealFilter, DeckFilter, DualUseSignalFilter
from .serializers import DealSerializer, DeckSerializer, DualUseSignalSerializer, IndustrySerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deals'),
        description=_('Retrieve a list of deals.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Deal'),
        description=_('Retrieve details of a specific deal.'),
    ),
)
class DealViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = DealSerializer
    lookup_field = 'uuid'
    filterset_class = DealFilter
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Deal.objects\
            .select_related('company')\
            .prefetch_related('industries', 'dual_use_signals', 'founder_signals')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Decks'),
        description=_('Retrieve a list of decks.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Deck'),
        description=_('Retrieve details of a specific deck.'),
    ),
)
class DeckViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = DeckSerializer
    lookup_field = 'uuid'
    filterset_class = DeckFilter
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Deck.objects.select_related('deal')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deals Industries'),
        description=_('Retrieve a list of deals industries.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Deals Industry'),
        description=_('Retrieve details of a specific deals industry.'),
    ),
)
class IndustryViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = IndustrySerializer
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Industry.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deals DU Signals'),
        description=_('Retrieve a list of deals dual use signals.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Deals DU Signal'),
        description=_('Retrieve details of a specific deals dual use signal.'),
    ),
)
class DualUseSignalViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = DualUseSignalSerializer
    lookup_field = 'uuid'
    filterset_class = DualUseSignalFilter
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return DualUseSignal.objects.select_related('category')
