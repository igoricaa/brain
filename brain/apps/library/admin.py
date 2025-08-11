from django.contrib import admin, messages
from django.utils.translation import ngettext

from import_export.admin import ImportExportModelAdmin

from .models import (
    ArxivSearch,
    Category,
    DocumentType,
    File,
    Paper,
    PaperAuthor,
    PaperAuthorship,
    SemanticScholarSearch,
    Source,
)
from .tasks import pull_arxiv_search, pull_semantic_scholar_search


class PaperAuthorInline(admin.TabularInline):
    model = PaperAuthorship
    raw_id_fields = ['author']
    extra = 0
    show_change_link = True


class AuthorPaperInline(admin.TabularInline):
    model = PaperAuthorship
    raw_id_fields = ['paper']
    extra = 0
    show_change_link = True


@admin.register(DocumentType)
class DocumentTypeAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(Category)
class CategoryAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(Source)
class SourceAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description', 'website']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name', 'website']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(File)
class FileAdmin(ImportExportModelAdmin):
    list_display = ['file_name', 'uuid', 'source']
    list_select_related = ['source']
    list_filter = ['mime_type', 'created_at', 'updated_at']
    search_fields = ['=id', '=uuid', 'file']
    filter_horizontal = ['categories']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']


@admin.register(PaperAuthor)
class PaperAuthorAdmin(ImportExportModelAdmin):
    list_display = ['name', 'citation_count', 'paper_count', 'country', 'linkedin_url']
    list_filter = ['country', 'created_at', 'updated_at']
    search_fields = ['=id', '=uuid', 'name', 'linkedin_url']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    inlines = [AuthorPaperInline]


@admin.register(Paper)
class PaperAdmin(ImportExportModelAdmin):
    list_display = ['title', 'source', 'tldr']
    list_select_related = ['source']
    list_filter = ['document_types', 'categories', 'source', 'created_at', 'updated_at']
    filter_horizontal = ['categories', 'document_types']
    raw_id_fields = ['creator']
    search_fields = ['=id', '=uuid', '=title']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    inlines = [PaperAuthorInline]


@admin.register(SemanticScholarSearch)
class SemanticScholarAdmin(ImportExportModelAdmin):
    list_display = ['query', 'publication_types', 'fields_of_study', 'min_citation_count']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    actions = ["pull_papers"]

    @admin.action(description="Pull papers from the selected Semantic Scholar Searches")
    def pull_papers(self, request, queryset):
        for search in queryset:
            pull_semantic_scholar_search.delay(pk=search.pk)

        count = len(queryset)
        self.message_user(
            request,
            ngettext(
                "Papers from %d search will be pulled from semantic scholar.",
                "Papers from %d searches will be pulled from semantic scholar.",
                count,
            )
            % count,
            messages.SUCCESS,
        )


@admin.register(ArxivSearch)
class ArxivSearchAdmin(ImportExportModelAdmin):
    list_display = ['query', 'category', 'author']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    actions = ["pull_papers"]

    @admin.action(description="Pull papers from the selected ArXiv searches")
    def pull_papers(self, request, queryset):
        for search in queryset:
            pull_arxiv_search.delay(pk=search.pk)

        count = len(queryset)
        self.message_user(
            request,
            ngettext(
                "Papers from %d search will be pulled from ArXiv.",
                "Papers from %d searches will be pulled from ArXiv.",
                count,
            )
            % count,
            messages.SUCCESS,
        )
