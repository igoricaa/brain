from django.utils.translation import gettext_lazy as _

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination

from ..models import Education, Experience, Profile
from .filters import EducationFilter, ExperienceFilter, ProfileFilter
from .serializers import EducationSerializer, ExperienceSerializer, ProfileSerializer

__all__ = ["ProfileViewSet", "ExperienceViewSet", "EducationViewSet"]


@extend_schema_view(
    list=extend_schema(
        summary=_("List Individual Profiles"),
        description=_("Retrieve a list of individual profiles."),
    ),
    retrieve=extend_schema(
        summary=_("Get Individual Profile"),
        description=_("Retrieve details of a specific individual profile."),
    ),
)
class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """Individual profiles API endpoint."""

    serializer_class = ProfileSerializer
    filterset_class = ProfileFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = "uuid"
    search_fields = [
        "name",
        "website",
        "location",
        "bachelor_degree_type",
        "bachelor_school",
        "graduate_degree_type",
        "graduate_school",
        "phd_school",
    ]
    ordering_fields = [
        "name",
        "location",
        "bachelor_grad_year",
        "created_at",
        "updated_at",
    ]
    ordering = ["name"]
    required_scopes = ["default"]

    def get_queryset(self):
        return Profile.objects.prefetch_related('experiences', 'educations')


@extend_schema_view(
    list=extend_schema(
        summary=_("List Professional Experiences"),
        description=_("Retrieve a list of professional experiences."),
    ),
    retrieve=extend_schema(
        summary=_("Get Professional Experience"),
        description=_("Retrieve details of a specific professional experience."),
    ),
)
class ExperienceViewSet(viewsets.ReadOnlyModelViewSet):
    """Professional experiences API endpoint."""

    serializer_class = ExperienceSerializer
    filterset_class = ExperienceFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = "uuid"
    search_fields = ["company_name", "title", "location", "website"]
    ordering_fields = [
        "company_name",
        "title",
        "location",
        "date_from",
        "date_to",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date_from"]
    required_scopes = ["default"]

    def get_queryset(self):
        return Experience.objects.select_related("profile")


@extend_schema_view(
    list=extend_schema(
        summary=_("List Educational Qualifications"),
        description=_("Retrieve a list of educational qualifications."),
    ),
    retrieve=extend_schema(
        summary=_("Get Educational Qualification"),
        description=_("Retrieve details of a specific educational qualification."),
    ),
)
class EducationViewSet(viewsets.ReadOnlyModelViewSet):
    """Educational qualifications API endpoint."""

    serializer_class = EducationSerializer
    filterset_class = EducationFilter
    pagination_class = PageNumberPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    lookup_field = "uuid"
    search_fields = ["institution_name", "program_name", "website"]
    ordering_fields = [
        "institution_name",
        "program_name",
        "date_from",
        "date_to",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date_from"]
    required_scopes = ["default"]

    def get_queryset(self):
        return Education.objects.select_related("profile")
