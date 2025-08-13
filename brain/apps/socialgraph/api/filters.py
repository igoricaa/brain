from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import Education, Experience, Profile

__all__ = ["ProfileFilter", "ExperienceFilter", "EducationFilter"]


class ProfileFilter(filters.FilterSet):

    name = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by name."),
    )

    country = filters.CharFilter(
        field_name="country",
        help_text=_("Filter by country code."),
    )

    country_in = filters.BaseInFilter(
        field_name="country",
        help_text=_("Filter by multiple country codes."),
    )

    location = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by location."),
    )

    bachelor_grad_year = filters.NumberFilter(
        field_name="bachelor_grad_year",
        help_text=_("Filter by bachelor's graduation year."),
    )

    bachelor_grad_year_gte = filters.NumberFilter(
        field_name="bachelor_grad_year",
        lookup_expr="gte",
        help_text=_("Filter by bachelor's graduation year greater than or equal to the given value."),
    )

    bachelor_grad_year_lte = filters.NumberFilter(
        field_name="bachelor_grad_year",
        lookup_expr="lte",
        help_text=_("Filter by bachelor's graduation year less than or equal to the given value."),
    )

    bachelor_degree_type = filters.CharFilter(
        field_name="bachelor_degree_type",
        lookup_expr="iexact",
        help_text=_("Filter by bachelor's degree type."),
    )

    bachelor_school = filters.CharFilter(
        field_name="bachelor_school",
        lookup_expr="icontains",
        help_text=_("Filter by bachelor's school name."),
    )

    graduate_degree_type = filters.CharFilter(
        field_name="graduate_degree_type",
        lookup_expr="iexact",
        help_text=_("Filter by graduate degree type."),
    )

    graduate_school = filters.CharFilter(
        field_name="graduate_school",
        lookup_expr="icontains",
        help_text=_("Filter by graduate school name."),
    )

    phd_school = filters.CharFilter(
        field_name="phd_school",
        lookup_expr="icontains",
        help_text=_("Filter by PhD school name."),
    )

    has_military_or_govt_background = filters.BooleanFilter(
        field_name="has_military_or_govt_background",
        help_text=_("Filter by military or government background."),
    )

    military_or_govt_background = filters.CharFilter(
        field_name="military_or_govt_background",
        lookup_expr="icontains",
        help_text=_("Filter by military or government background."),
    )

    military_or_govt_background_in = filters.BaseInFilter(
        field_name="military_or_govt_background",
        lookup_expr="overlap",
        help_text=_("Filter by multiple military or government background."),
    )

    updated = filters.DateTimeFromToRangeFilter(
        field_name='updated_at',
        help_text=_('filter by time the record was last updated'),
    )

    created = filters.DateTimeFromToRangeFilter(
        field_name='created_at',
        help_text=_('filter by time the record was created'),
    )

    class Meta:
        model = Profile
        fields = [
            "name",
            "country",
            "country_in",
            "location",
            "bachelor_grad_year",
            "bachelor_grad_year_gte",
            "bachelor_grad_year_lte",
            "bachelor_degree_type",
            "bachelor_school",
            "graduate_degree_type",
            "graduate_school",
            "phd_school",
            "has_military_or_govt_background",
            "military_or_govt_background",
            "military_or_govt_background_in",
        ]


class ExperienceFilter(filters.FilterSet):

    profile = filters.UUIDFilter(
        field_name="profile__uuid",
        help_text=_("Filter by profile UUID."),
    )

    company_name = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by company name."),
    )

    title = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by job title."),
    )

    location = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by job location."),
    )

    duration_gte = filters.DurationFilter(
        field_name="duration",
        lookup_expr="gte",
        help_text=_(
            "Filter by duration greater than or equal to the given value in ISO 8601 duration "
            "(e.g., 'PT30M' (30 minutes), 'PT2H' (2 hours), 'P1D' (1 day), 'P3DT4H' (3 days 4 hours))."
        ),
    )

    duration_lte = filters.DurationFilter(
        field_name="duration",
        lookup_expr="lte",
        help_text=_(
            "Filter by duration less than or equal to the given value in ISO 8601 duration "
            "(e.g., 'PT30M' (30 minutes), 'PT2H' (2 hours), 'P1D' (1 day), 'P3DT4H' (3 days 4 hours))."
        ),
    )

    class Meta:
        model = Experience
        fields = ["profile", "company_name", "title", "location", "duration_gte", "duration_lte"]


class EducationFilter(filters.FilterSet):

    profile = filters.UUIDFilter(
        field_name="profile__uuid",
        help_text=_("Filter by profile UUID."),
    )

    institution_name = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by institution name."),
    )

    program_name = filters.CharFilter(
        lookup_expr="icontains",
        help_text=_("Filter by program name."),
    )

    class Meta:
        model = Education
        fields = ["profile", "institution_name", "program_name"]
