from django import forms
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import django_filters
from common.filters import SearchVectorFilterSet
from companies.models import Industry
from django_countries import countries

from .models import Report


class ReportListFilter(SearchVectorFilterSet):

    YEAR_CHOICES = [*[(year, str(year)) for year in range(2000, now().year + 1)]]
    year_evaluated = django_filters.TypedMultipleChoiceFilter(
        coerce=int,
        choices=YEAR_CHOICES,
        required=False,
        empty_value=None,
    )

    industries = django_filters.ModelMultipleChoiceFilter(
        queryset=Industry.objects.all(),
        conjoined=False,
    )

    hq_country = django_filters.TypedMultipleChoiceFilter(
        choices=countries,
        coerce=str,
        # lookup_expr='in',
    )

    thesis_fit = django_filters.BooleanFilter(
        widget=forms.Select(
            choices=[
                (None, ''),
                (True, _('Yes')),
                (False, _('No')),
            ]
        )
    )

    search_vector_fields = ['name']

    class Meta:
        model = Report
        fields = ['q', 'year_evaluated', 'industries', 'hq_country', 'thesis_fit']
