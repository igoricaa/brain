import uuid

from django.apps import apps
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

from semanticscholar import SemanticScholar

__all__ = ['SemanticScholarSearch']

from semanticscholar.Paper import Paper


class SemanticScholarSearch(models.Model):
    """Semantic scholars search parameters

    https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/get_graph_paper_relevance_search
    """

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    source = models.ForeignKey(
        'librarain.Source',
        on_delete=models.SET_NULL,
        related_name='semantic_scholar_searches',
        related_query_name='semantic_scholar_search',
        blank=True,
        null=True,
        verbose_name='source',
    )

    query = models.CharField(
        _('query'),
        max_length=255,
        help_text=_(
            'A plain-text search query string. No special query syntax is supported. '
            'Hyphenated query terms yield no matches (replace it with space to find matches.)'
        )
    )

    publication_types = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        verbose_name=_('publication types'),
    )

    fields_of_study = ArrayField(
        models.CharField(max_length=128),
        default=list,
        blank=True,
        verbose_name=_('fields of study'),
    )

    open_access_pdf = models.BooleanField(
        _('open access PDF'),
        default=True,
        help_text=_('Restricts results to only include papers with a public PDF.'),
    )

    min_citation_count = models.PositiveIntegerField(
        _('minimum citations'),
        blank=True,
        null=True,
        help_text=_('Restricts results to only include papers with the minimum number of citations'),
    )

    publication_date = models.CharField(
        _('publication date range'),
        max_length=50,
        blank=True,
        help_text=_(
            'Restricts results to the given range of publication dates or years (inclusive). '
            'Accepts the format <startDate>:<endDate> with each date in YYYY-MM-DD format. '
            'Partial dates including year or year and month only, exact dates and open ended ranges are '
            'also supported.'
        ),
    )

    year = models.CharField(
        _('year'),
        max_length=50,
        blank=True,
        help_text=_(
            'Restricts results to the given publication year or range of years (inclusive). '
            'Examples: `2019` in 2019; `2016-2020` as early as 2016 or as late as 2020; '
            '`2010-` during or after 2010; `-2015` before or during 2015'
        ),
    )

    venue = ArrayField(
        models.CharField(max_length=128),
        default=list,
        blank=True,
        verbose_name=_('venue'),
    )

    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True,
        db_default=Now(),
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True,
    )

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict,
    )

    class Meta:
        verbose_name = _('Semantic Scholar Search')
        verbose_name_plural = _('Semantic Scholar Searches')

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        query = str(self.query_params)
        if self.source:
            source = str(self.source)
            return f'{source}: {query}'
        else:
            return query

    @property
    def query_params(self):
        params = {
            'query': self.query,
            'publication_types': self.publication_types,
            'fields_of_study': self.fields_of_study,
            'min_citation_count': self.min_citation_count,
            'publication_date_or_year': self.publication_date,
            'year': self.year,
            'venue': self.venue,
        }

        params = {k: v for k, v in params.items() if v}

        if self.open_access_pdf:
            params['open_access_pdf'] = True

        return params

    def pull_papers(self, save=True, limit=100, **kwargs):

        semantic_scholar = SemanticScholar()

        fields = (Paper.SEARCH_FIELDS + ['tldr', 'references', 'citations'])
        fields = list(set(fields))

        params = {**self.query_params, 'fields': fields, **kwargs}

        results = semantic_scholar.search_paper(limit=limit, **params)

        if save:
            self._save_results(results)

        return results

    def _get_paper_document_kwargs(self, paper):
        kwargs = {
            'source': self.source,
            'title': paper.title,
            'abstract': paper.abstract or '',
            'semantic_scholar_id': paper.paperId,
            'src_id': paper.paperId,
            'src_url': paper.url,
            'publication_year': paper.year,
            'publication_date': paper.publicationDate
        }

        if paper.tldr:
            tldr = paper.tldr.text or ''
            kwargs['tldr'] = tldr

        arxiv_id = paper.externalIds.get('ArXiv')
        if arxiv_id:
            kwargs['arxiv_id'] = arxiv_id

        open_access_pdf = paper.openAccessPdf
        if open_access_pdf:
            kwargs['src_download_url'] = open_access_pdf.get('url') or ''
            kwargs['license'] = open_access_pdf.get('license') or ''

        tags = set()
        if paper.fieldsOfStudy:
            tags.update([f.lower() for f in paper.fieldsOfStudy])

        if paper.s2FieldsOfStudy:
            tags.update([f['category'].lower() for f in paper.s2FieldsOfStudy])

        kwargs['tags'] = list(tags)

        return kwargs

    @classmethod
    def _gen_paper_authors_kwargs(cls, paper):
        paper_authors = paper.authors or []

        for paper_author in paper_authors:

            yield {
                'name': paper_author.name or '',
                'semantic_scholar_id': paper_author.authorId,
            }

    def _save_results(self, results):
        document_model = apps.get_registered_model('librarain', 'Document')
        author_model = apps.get_registered_model('librarain', 'Author')

        for paper in results.items:
            document_kwargs = self._get_paper_document_kwargs(paper)
            document, doc_created = document_model.objects.update_or_create(
                semantic_scholar_id=document_kwargs.pop('semantic_scholar_id'),
                defaults=document_kwargs,
            )

            authors = []
            for author_kwargs in self._gen_paper_authors_kwargs(paper):
                author, author_created = author_model.objects.update_or_create(
                    semantic_scholar_id=author_kwargs.pop('semantic_scholar_id'),
                    defaults=author_kwargs,
                )
                authors.append(author)

            document.authors.set(authors)
