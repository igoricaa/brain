from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import City, State

__all__ = ["StateFilter", "CityFilter"]


class StateFilter(filters.FilterSet):

    country = filters.CharFilter(
        field_name="country",
        help_text=_("Filter by country code."),
    )

    country_in = filters.BaseInFilter(
        field_name="country",
        help_text=_("Filter by multiple country codes."),
    )

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    code_in = filters.BaseInFilter(
        field_name="code",
        help_text=_("Filter by multiple codes."),
    )

    class Meta:
        model = State
        fields = ["country", "country_in", "name", "code", "code_in"]


class CityFilter(filters.FilterSet):
    country = filters.CharFilter(
        field_name="country",
        help_text=_("Filter by country code."),
    )

    country_in = filters.BaseInFilter(
        field_name="country",
        help_text=_("Filter by multiple country codes."),
    )

    state = filters.UUIDFilter(
        field_name="state__uuid",
        help_text=_("Filter by state UUID."),
    )

    state_in = filters.BaseInFilter(
        field_name="state__uuid",
        help_text=_("Filter by multiple state UUIDs."),
    )

    state_name = filters.CharFilter(
        field_name="state__name",
        lookup_expr="iexact",
        help_text=_("Filter by state name."),
    )

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    code = filters.CharFilter(
        field_name="code",
        lookup_expr="iexact",
        help_text=_("Filter by code."),
    )

    code_in = filters.BaseInFilter(
        field_name="code",
        help_text=_("Filter by multiple codes."),
    )

    class Meta:
        model = City
        fields = ["country", "country_in", "state", "state_in", "state_name", "name", "code", "code_in"]
