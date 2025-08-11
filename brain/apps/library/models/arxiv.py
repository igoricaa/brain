import uuid

from django.apps import apps
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

import arxiv

__all__ = ['ArxivSearch']

from aindex.utils import parse_arxiv_paper_url


class ArxivSearch(models.Model):
    """ArXiv search parameters

    https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/get_graph_paper_relevance_search
    """

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    source = models.ForeignKey(
        'library.Source',
        on_delete=models.SET_NULL,
        related_name='arxiv_searches',
        related_query_name='arxiv_search',
        blank=True,
        null=True,
        verbose_name='source',
    )

    query = models.CharField(_('query'), max_length=255, blank=True, help_text=_('a text search query.'))

    title = models.CharField(
        _('title'),
        max_length=255,
        blank=True,
    )

    author = models.CharField(
        _('author'),
        max_length=255,
        blank=True,
    )

    abstract = models.CharField(
        _('abstract'),
        max_length=255,
        blank=True,
    )

    journal_reference = models.CharField(
        _('journal reference'),
        max_length=255,
        blank=True,
    )

    category = models.CharField(
        _('category'),
        max_length=255,
        blank=True,
    )

    submitted_date = models.CharField(
        _('submitted date'),
        max_length=50,
        blank=True,
        help_text=_(
            'The expected format is [YYYYMMDDTTTT+TO+YYYYMMDDTTTT] were the TTTT '
            'is provided in 24 hour time to the minute, in GMT. '
            'We could construct the following query using submittedDate.'
        ),
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
        verbose_name = _('ArXiv Search')
        verbose_name_plural = _('ArXiv Searches')

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
            'all': self.query,
            'ti': self.title,
            'au': self.author,
            'abs': self.abstract,
            'jr': self.journal_reference,
            'cat': self.category,
            'submittedDate': self.submitted_date,
        }

        params = {k: v for k, v in params.items() if v}

        return params

    @property
    def query_text(self):
        params = [f'{k}:{v}' for k, v in self.query_params.items()]
        return ' AND '.join(params)

    def pull_papers(self, save=True, max_results=100, **kwargs):

        client = arxiv.Client()

        search = arxiv.Search(
            query=self.query_text,
            max_results=max_results,
            **kwargs,
        )

        results = list(client.results(search))

        if save:
            self._save_results(results)

        return results

    def _save_results(self, results):
        paper_model = apps.get_registered_model('library', 'Paper')
        author_model = apps.get_registered_model('library', 'PaperAuthor')

        for result in results:
            paper_kwargs = self._get_paper_kwargs(result)

            arxiv_id = paper_kwargs.pop('arxiv_id')
            if not arxiv_id:
                raise ValueError(_("Couldn't determine paper ID"))

            paper, doc_created = paper_model.objects.update_or_create(
                arxiv_id=arxiv_id,
                defaults=paper_kwargs,
            )

            authors = []
            for author_kwargs in self._gen_paper_authors_kwargs(result):
                author = author_model(**author_kwargs)
                author.save()
                authors.append(author)

            paper.authors.set(authors)

    def _get_paper_kwargs(self, paper):

        page_url_info = parse_arxiv_paper_url(paper.entry_id) or {}
        arxiv_id = page_url_info.get('id')

        kwargs = {
            'source': self.source,
            'title': paper.title,
            'abstract': paper.summary or '',
            'arxiv_id': arxiv_id,
            'src_id': arxiv_id,
            'src_url': paper.entry_id,
            'src_download_url': paper.pdf_url or '',
        }

        if paper.published:
            kwargs['publication_date'] = paper.published
            kwargs['publication_year'] = paper.published.year

        tags = set()
        if paper.categories:
            tags.update([tag.lower() for tag in paper.categories])

        kwargs['tags'] = list(tags)

        return kwargs

    @classmethod
    def _gen_paper_authors_kwargs(cls, paper):
        paper_authors = paper.authors or []

        for paper_author in paper_authors:

            yield {
                'name': paper_author.name or '',
                'extras': {'_og_src': 'arvix'},
            }
