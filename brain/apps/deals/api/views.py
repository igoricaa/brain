from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from ..models import Deal, DealFile, Deck, DraftDeal, DualUseSignal, Paper, DealAssessment
from .filters import DealFileFilter, DealFilter, DeckFilter, DualUseSignalFilter, PaperFilter
from .serializers import (
    DealFileReadSerializer,
    DealFileSerializer,
    DealReadSerializer,
    DealSerializer,
    DeckSerializer,
    DraftDealSerializer,
    DualUseSignalSerializer,
    PaperSerializer,
    DealAssessmentSerializer,
    DealAssessmentReadSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deals'),
        description=_('Retrieve a list of deals.'),
    ),
    retrieve=extend_schema(
        summary=_('Deal Details'),
        description=_('Retrieve details of a specific deal.'),
    ),
    create=extend_schema(
        summary=_('Create Deal'),
        description=_('Add a new deal.'),
    ),
    update=extend_schema(
        summary=_('Update Deal'),
        description=_('Update a deal.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deal'),
        description=_('Partially update a deal.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Deal'),
        description=_('Delete a deal.'),
    ),
)
class DealViewSet(ModelViewSet):

    lookup_field = 'uuid'
    filterset_class = DealFilter
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Deal.objects.select_related('company', 'funding_stage', 'funding_type').prefetch_related(
            'industries', 'dual_use_signals'
        )

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return DealReadSerializer
        else:
            return DealSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Draft Deals'),
        description=_('Retrieve a list of draft deals.'),
    ),
    retrieve=extend_schema(
        summary=_('Draft Deal Details'),
        description=_('Retrieve details of a specific draft deal.'),
    ),
    create=extend_schema(
        summary=_('Create Draft Deal'),
        description=_('Add a new draft deal.'),
    ),
    update=extend_schema(
        summary=_('Update Draft Deal'),
        description=_('Update a draft deal.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Draft Deal'),
        description=_('Partially update a draft deal.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Draft Deal'),
        description=_('Delete a draft deal.'),
    ),
    finalize=extend_schema(
        summary=_('Finalize Draft Deal'),
        description=_('Finalize a draft deal and make it a regular deal.'),
    ),
)
class DraftDealViewSet(DealViewSet):

    lookup_field = 'uuid'
    filterset_class = DealFilter
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return DraftDeal.objects.select_related('company', 'funding_stage', 'funding_type').prefetch_related(
            'industries', 'dual_use_signals'
        )

    def get_serializer_class(self):
        if action == 'finalize':
            return DealReadSerializer
        return DraftDealSerializer

    @action(
        methods=['post'],
        detail=True,
        url_path="finalize",
        url_name="finalize",
        name=_('Finalize Draft Deal'),
    )
    def finalize(self, request, **kwargs):
        draft = self.get_object()
        deal = draft.finalize()
        serializer = self.get_serializer_class()(instance=deal)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deal Files'),
        description=_('Retrieve a list of deal files.'),
        responses={200: DealFileReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Deal File Details'),
        description=_('Retrieve details of a specific deal file.'),
        responses={200: DealFileReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create Deal File'),
        description=_('Add a new deal file.'),
    ),
    update=extend_schema(
        summary=_('Update Deal File'),
        description=_('Update a deal file.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deal File'),
        description=_('Partially update a deal file.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Deal File'),
        description=_('Delete a deal file.'),
    ),
)
class DealFileViewSet(ModelViewSet):

    lookup_field = 'uuid'
    filterset_class = DealFileFilter
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return DealFile.objects.select_related('deal')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return DealFileReadSerializer
        else:
            return DealFileSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deals Papers'),
        description=_('Retrieve a list of deal papers.'),
    ),
    retrieve=extend_schema(
        summary=_('Deal Paper Details'),
        description=_('Retrieve details of a specific deal paper.'),
    ),
)
class PaperViewSet(DealFileViewSet):

    serializer_class = PaperSerializer
    filterset_class = PaperFilter

    def get_queryset(self):
        return Paper.objects.select_related('deal')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Decks'),
        description=_('Retrieve a list of decks.'),
    ),
    retrieve=extend_schema(
        summary=_('Deck Details'),
        description=_('Retrieve details of a specific deck.'),
    ),
)
class DeckViewSet(ReadOnlyModelViewSet):

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
        summary=_('List Deals Dual Use Signals'),
        description=_('Retrieve a list of deals dual use signals.'),
    ),
    retrieve=extend_schema(
        summary=_('Deals Dual Signal Details'),
        description=_('Retrieve details of a specific deals dual use signal.'),
    ),
)
class DualUseSignalViewSet(ReadOnlyModelViewSet):

    serializer_class = DualUseSignalSerializer
    lookup_field = 'uuid'
    filterset_class = DualUseSignalFilter
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return DualUseSignal.objects.select_related('category')


@extend_schema_view(
    list=extend_schema(
        summary=_('List Deal Assessments'),
        description=_('Retrieve a list of deal assessments.'),
    ),
    retrieve=extend_schema(
        summary=_('Deal Assessment Details'),
        description=_('Retrieve a specific deal assessment.'),
    ),
    create=extend_schema(
        summary=_('Create Deal Assessment'),
        description=_('Create a new deal assessment for a deal.'),
    ),
    update=extend_schema(
        summary=_('Update Deal Assessment'),
        description=_('Update a deal assessment.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deal Assessment'),
        description=_('Partially update a deal assessment.'),
    ),
)
class DealAssessmentViewSet(ModelViewSet):

    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        qs = DealAssessment.objects.select_related('deal')
        deal_uuid = self.request.query_params.get('deal')
        if deal_uuid:
            qs = qs.filter(deal__uuid=deal_uuid)
        return qs

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return DealAssessmentReadSerializer
        return DealAssessmentSerializer
