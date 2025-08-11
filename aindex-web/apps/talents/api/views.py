from django.utils.translation import gettext_lazy as _

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ReadOnlyModelViewSet

from ..models import Founder
from .filters import FounderFilter
from .serializers import FounderSerializer


@extend_schema_view(
    list=extend_schema(
        summary=_('List Founders'),
        description=_('Retrieve a list of founders.'),
    ),
    retrieve=extend_schema(
        summary=_('Get Founder'),
        description=_('Retrieve details of a specific founder.'),
    ),
)
class FounderViewSet(ReadOnlyModelViewSet):
    serializer_class = FounderSerializer
    filterset_class = FounderFilter
    lookup_field = 'uuid'
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    required_scopes = ['default']

    def get_queryset(self):
        return Founder.objects\
            .select_related('company')\
            .prefetch_related('experiences', 'educations')
