from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import Report

__all__ = ["ReportFilter"]


class ReportFilter(filters.FilterSet):
    company = filters.UUIDFilter(
        field_name="company__uuid",
        help_text=_("Filter by company UUID."),
    )

    company_in = filters.BaseInFilter(
        field_name="company__uuid",
        help_text=_("Filter by multiple company UUIDs."),
    )

    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text=_("Filter by name (case-insensitive substring match)."),
    )

    year_founded = filters.NumberFilter(
        field_name="year_founded",
        help_text=_("Filter by founding year."),
    )

    year_founded_gte = filters.NumberFilter(
        field_name="year_founded",
        lookup_expr="gte",
        help_text=_("Filter by founding year greater than or equal to the given value."),
    )

    year_founded_lte = filters.NumberFilter(
        field_name="year_founded",
        lookup_expr="lte",
        help_text=_("Filter by founding year less than or equal to the given value."),
    )

    year_evaluated = filters.NumberFilter(
        field_name="year_evaluated",
        help_text=_("Filter by evaluation year."),
    )

    year_evaluated_gte = filters.NumberFilter(
        field_name="year_evaluated",
        lookup_expr="gte",
        help_text=_("Filter by evaluation year greater than or equal to the given value."),
    )

    year_evaluated_lte = filters.NumberFilter(
        field_name="year_evaluated",
        lookup_expr="lte",
        help_text=_("Filter by evaluation year less than or equal to the given value."),
    )

    hq_country = filters.CharFilter(
        field_name="hq_country",
        help_text=_("Filter by HQ country code."),
    )

    hq_country_in = filters.BaseInFilter(
        field_name="hq_country",
        help_text=_("Filter by multiple HQ country codes."),
    )

    hq_postal_code = filters.CharFilter(
        field_name="hq_postal_code",
        lookup_expr="iexact",
        help_text=_("Filter by HQ postal code."),
    )

    hq_postal_code_in = filters.BaseInFilter(
        field_name="hq_postal_code",
        help_text=_("Filter by multiple HQ postal codes."),
    )

    thesis_fit = filters.BooleanFilter(
        field_name="thesis_fit",
        help_text=_("Filter by whether the report is thesis fit."),
    )

    has_diversity_on_founders = filters.BooleanFilter(
        field_name="has_diversity_on_founders",
        help_text=_("Filter by whether the founding team has diversity."),
    )

    has_women_on_founders = filters.BooleanFilter(
        field_name="has_women_on_founders",
        help_text=_("Filter by whether there are women on the founding team."),
    )

    has_black_on_founders = filters.BooleanFilter(
        field_name="has_black_on_founders",
        help_text=_("Filter by whether there are Black/African members on the founding team."),
    )

    has_hispanic_on_founders = filters.BooleanFilter(
        field_name="has_hispanic_on_founders",
        help_text=_("Filter by whether there are Hispanic members on the founding team."),
    )

    has_asian_on_founders = filters.BooleanFilter(
        field_name="has_asian_on_founders",
        help_text=_("Filter by whether there are Asian members on the founding team."),
    )

    has_meo_on_founders = filters.BooleanFilter(
        field_name="has_meo_on_founders",
        help_text=_("Filter by whether there are Middle Eastern/Other members on the founding team."),
    )

    is_reviewed = filters.BooleanFilter(
        field_name="is_reviewed",
        help_text=_("Filter by whether the report is reviewed."),
    )

    created_at = filters.DateTimeFromToRangeFilter(
        field_name="created_at",
        help_text=_("Filter by the time the record was created."),
    )

    updated_at = filters.DateTimeFromToRangeFilter(
        field_name="updated_at",
        help_text=_("Filter by the time the record was last updated."),
    )

    class Meta:
        model = Report
        fields = [
            "company",
            "company_in",
            "name",
            "year_founded",
            "year_founded_gte",
            "year_founded_lte",
            "year_evaluated",
            "year_evaluated_gte",
            "year_evaluated_lte",
            "hq_country",
            "hq_country_in",
            "hq_postal_code",
            "hq_postal_code_in",
            "thesis_fit",
            "has_diversity_on_founders",
            "has_women_on_founders",
            "has_black_on_founders",
            "has_hispanic_on_founders",
            "has_asian_on_founders",
            "has_meo_on_founders",
            "is_reviewed",
            "created_at",
            "updated_at",
        ]
