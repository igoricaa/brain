from django.db.models import OuterRef, Subquery
from django.utils.translation import gettext_lazy as _

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from ..models import Deal, DealAssessment, DealFile, Deck, DraftDeal, DualUseSignal, Paper
from .filters import DealAssessmentFilter, DealFileFilter, DealFilter, DeckFilter, DualUseSignalFilter, PaperFilter
from .serializers import (
    DealAssessmentReadSerializer,
    DealAssessmentSerializer,
    DealFileReadSerializer,
    DealFileSerializer,
    DealReadSerializer,
    DealSerializer,
    DeckReadSerializer,
    DeckSerializer,
    DraftDealSerializer,
    DualUseSignalSerializer,
    PaperReadSerializer,
    PaperSerializer,
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
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_class = DealFilter
    search_fields = ['name', 'company__name', 'company__website']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        last_assessment = DealAssessment.objects.filter(deal=OuterRef("pk")).order_by("-created_at")
        return (
            Deal.ready_objects.annotate(last_assessment_created_at=Subquery(last_assessment.values('created_at')[:1]))
            .select_related('company', 'funding_stage', 'funding_type')
            .prefetch_related('industries', 'dual_use_signals')
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
        if self.action == 'finalize':
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
        summary=_('List Deal Assessments'),
        description=_('Retrieve a list of deal assessments.'),
        responses={200: DealAssessmentReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Deal Assessment Details'),
        description=_('Retrieve details of a specific deal assessment.'),
        responses={200: DealAssessmentReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create Deal Assessment'),
        description=_('Add a new deal assessment.'),
    ),
    update=extend_schema(
        summary=_('Update Deal Assessment'),
        description=_('Update a deal assessment.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deal Assessment'),
        description=_('Partially update a deal assessment.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Deal Assessment'),
        description=_('Delete a deal assessment.'),
    ),
)
class DealAssessmentViewSet(ModelViewSet):

    lookup_field = 'uuid'
    filterset_class = DealAssessmentFilter
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return DealAssessment.objects.select_related('deal')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return DealAssessmentReadSerializer
        else:
            return DealAssessmentSerializer


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
        responses={200: PaperReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Deal Paper Details'),
        description=_('Retrieve details of a specific deal paper.'),
        responses={200: PaperReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create Deal Paper'),
        description=_('Add a new deal file.'),
    ),
    update=extend_schema(
        summary=_('Update Deal Paper'),
        description=_('Update a deal paper.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deal Paper'),
        description=_('Partially update a deal paper.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Deal Paper'),
        description=_('Delete a deal paper.'),
    ),
)
class PaperViewSet(ModelViewSet):

    lookup_field = 'uuid'
    serializer_class = PaperSerializer
    filterset_class = PaperFilter
    ordering_fields = ['created_at', 'updated_at', 'title', 'citation_count']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Paper.objects.select_related('deal')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return PaperReadSerializer
        else:
            return PaperReadSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Decks'),
        description=_('Retrieve a list of decks.'),
        responses={200: DeckReadSerializer},
    ),
    retrieve=extend_schema(
        summary=_('Deck Details'),
        description=_('Retrieve details of a specific deck.'),
        responses={200: DeckReadSerializer},
    ),
    create=extend_schema(
        summary=_('Create Deck'),
        description=_('Add a new deck.'),
    ),
    update=extend_schema(
        summary=_('Update Deck'),
        description=_('Update a deck.'),
    ),
    partial_update=extend_schema(
        summary=_('Partially Update Deck'),
        description=_('Partially update a deck.'),
    ),
    destroy=extend_schema(
        summary=_('Delete Deck'),
        description=_('Delete a deck.'),
    ),
)
class DeckViewSet(ModelViewSet):

    lookup_field = 'uuid'
    serializer_class = DeckSerializer
    filterset_class = DeckFilter
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Deck.objects.select_related('deal')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return DeckReadSerializer
        else:
            return DeckReadSerializer


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
