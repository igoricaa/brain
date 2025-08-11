from django.utils.translation import gettext_lazy as _

from django_filters import rest_framework as filters

from ..models import File, Paper, PaperAuthor

__all__ = ['FileFilter', 'PaperFilter', 'PaperAuthorFilter']


class FileFilter(filters.FilterSet):

    source = filters.UUIDFilter(
        field_name='source__uuid',
        help_text=_('filter by source UUID'),
    )
    category = filters.UUIDFilter(
        field_name='categories__uuid',
        help_text=_('filter by category UUID'),
    )

    class Meta:
        model = File
        fields = ['source', 'category', 'processing_status']


class PaperFilter(FileFilter):
    document_type = filters.UUIDFilter(
        field_name='document_types__uuid',
        help_text=_('filter by document types UUID'),
    )

    author = filters.UUIDFilter(
        field_name='authors__uuid',
        help_text=_('filter by author UUID'),
    )

    class Meta(FileFilter.Meta):
        model = Paper
        fields = ['source', 'category', 'document_type', 'authors', 'processing_status']


class PaperAuthorFilter(FileFilter):

    paper = filters.UUIDFilter(
        field_name='paper__uuid',
        help_text=_('filter by paper UUID'),
    )

    class Meta(FileFilter.Meta):
        model = PaperAuthor
        fields = ['paper', 'linkedin_url', 'semantic_scholar_id', 'arxiv_id', 'country']
