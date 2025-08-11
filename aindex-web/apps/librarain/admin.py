from django.contrib import admin, messages
from django.utils.translation import ngettext

from import_export.admin import ImportExportModelAdmin

from .models import (ArxivSearch, Author, Category, Citation, Document, DocumentSection, DocumentType,
                     SemanticScholarSearch, Source)
from .tasks import pull_arxiv_search, pull_semantic_scholar_search


@admin.register(DocumentType)
class DocumentTypeAdmin(ImportExportModelAdmin):
    pass


@admin.register(Category)
class CategoryAdmin(ImportExportModelAdmin):
    pass


@admin.register(Source)
class SourceAdmin(ImportExportModelAdmin):
    pass


@admin.register(Author)
class AuthorAdmin(ImportExportModelAdmin):
    pass


@admin.register(Document)
class DocumentAdmin(ImportExportModelAdmin):
    list_display = ["title", "source", "tldr"]
    list_select_related = ["source"]
    list_filter = ["document_types", "categories", "source", "created_at", "updated_at"]
    raw_id_fields = ["creator", "authors"]
    search_fields = ["id", "uuid", "title"]
    readonly_fields = ["id", "uuid", "created_at", "updated_at"]


@admin.register(DocumentSection)
class DocumentSectionAdmin(ImportExportModelAdmin):
    pass


@admin.register(Citation)
class CitationAdmin(ImportExportModelAdmin):
    pass


@admin.register(SemanticScholarSearch)
class SemanticScholarAdmin(ImportExportModelAdmin):
    list_display = [
        "query",
        "publication_types",
        "fields_of_study",
        "min_citation_count",
    ]

    readonly_fields = ["id", "uuid", "created_at", "updated_at"]
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
    list_display = [
        "query",
        "category",
        "author",
    ]

    readonly_fields = ["id", "uuid", "created_at", "updated_at"]
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
