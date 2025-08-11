from django.utils.translation import gettext_lazy as _

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination

from ..models import City, State
from .filters import CityFilter, StateFilter
from .serializers import CitySerializer, StateSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List States'),
        description=_('Retrieve a list of states.'),
    ),
    retrieve=extend_schema(
        summary=_('Get State'),
        description=_('Retrieve details of a specific state.'),
    ),
)
class StateViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = StateSerializer
    filterset_class = StateFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return State.objects.all()


@extend_schema_view(
    list=extend_schema(
        summary=_('List Cities'),
        description=_('Retrieve a list of cities.'),
    ),
    retrieve=extend_schema(
        summary=_('Get City'),
        description=_('Retrieve details of a specific city.'),
    ),
)
class CityViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = CitySerializer
    filterset_class = CityFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = 'uuid'
    search_fields = ['name', 'code']
    ordering_fields = [
        'name',
        'created_at',
        'updated_at',
    ]
    ordering = ['name']
    required_scopes = ['default']

    def get_queryset(self):
        return City.objects.select_related('state')
