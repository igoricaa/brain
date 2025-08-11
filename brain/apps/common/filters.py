"""Custom Django filters for PostgreSQL full-text search.

It defines mixins and filterset classes to enable full-text search
functionality on Django querysets using PostgreSQL's `SearchVector`. These
filters are useful for performing text-based searches across multiple fields
in models.

Classes:
    SearchVectorFilterMixin:
        A mixin that adds full-text search capabilities to Django FilterSets.

    SearchVectorFilterSet:
        A custom FilterSet class that uses the mixin to apply PostgreSQL full-text search.
"""

from django.contrib.postgres.search import SearchVector
from django.utils.translation import gettext_lazy as _

import django_filters


class SearchVectorFilterMixin:
    """Mixin that adds full-text search capabilities to Django FilterSets.

    This mixin provides functionality to apply PostgreSQL full-text search to
    a queryset using the `SearchVector`. It allows performing full-text
    searches across multiple fields of a model.

    Attributes:
        search_vector_fields (list):
            A list of model field names on which full-text search should be performed.
            These fields must be compatible with full-text search in
            PostgreSQL.
    """

    search_vector_fields = []

    def filter_search_vector(self, queryset, name, value):
        """Apply full-text search on the given queryset.

        This method performs full-text search on the given queryset using the
        fields specified in `search_vector_fields`. The search is applied only
        if `search_vector_fields` is defined and a valid `value` (search term)
        is provided.

        Args:
            queryset (QuerySet):
                The queryset to be filtered.

            name (str):
                The name of the filter field (this parameter is required by
                `django_filters`, but it is not used in this method).

            value (str):
                The search term input. It is the string against which the
                full-text search is performed.

        Returns:
            QuerySet:
                A filtered queryset with the full-text search applied.

        Notes:
            - It is recommended to index the fields used in the search vector
              for optimal performance.
            - See Django documentation for details on indexing full-text search:
              https://docs.djangoproject.com/en/5.1/ref/contrib/postgres/search/#performance
            - See PostgreSQL documentation on text search indexing:
              https://www.postgresql.org/docs/current/textsearch-tables.html#TEXTSEARCH-TABLES-INDEX
        """
        # Ensure that search_vector_fields is defined and value is not empty
        has_search_vector_fields = len(set(self.search_vector_fields)) > 0
        has_search_term = value is not None and len(str(value).strip()) > 0
        if not has_search_vector_fields or not has_search_term:
            return queryset

        # Create the search vector from the specified fields
        search_vector = SearchVector(*self.search_vector_fields)

        # Annotate the queryset with the search vector and filter by the
        # search term
        search_term = str(value).strip()
        return queryset.annotate(search_vector=search_vector).filter(search_vector=search_term)


class SearchVectorFilterSet(SearchVectorFilterMixin, django_filters.FilterSet):
    """Base FilterSet with  PostgreSQL full-text search capabilities.

    This class extends `django_filters.FilterSet` and includes the
    functionality provided by `SearchVectorFilterMixin` to perform full-text
    searches on querysets. The search term is passed through the 'q' query
    parameter, and the search is applied across the fields specified in
    `search_vector_fields`.

    Attributes:
        q (django_filters.CharFilter):
            A filter field that receives the search term from the 'q' query parameter.
    """

    q = django_filters.CharFilter(
        label=_('Search text'),
        method='filter_search_vector',
    )

    class Meta:
        """Meta options for the `SearchVectorFilterSet`.

        Attributes:
            abstract (bool):
                Indicates that this is an abstract class and should not be
                instantiated directly.
        """

        abstract = True
