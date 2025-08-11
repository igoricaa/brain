from django_filters import rest_framework as filters

from ..models import City, State

__all__ = ["StateFilter", "CityFilter"]


class StateFilter(filters.FilterSet):
    q = filters.CharFilter(field_name='name', lookup_expr='icontains')

    class Meta:
        model = State
        fields = ["q", "country"]


class CityFilter(filters.FilterSet):
    q = filters.CharFilter(field_name='name', lookup_expr='icontains')
    state = filters.UUIDFilter(field_name="state__uuid")
    state_name = filters.CharFilter(field_name="state__name", lookup_expr='iexact')

    class Meta:
        model = City
        fields = ["q", "state", "state_name", "country"]
