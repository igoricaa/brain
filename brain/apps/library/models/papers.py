from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

from celery import chain as task_chain
from pgvector.django import HnswIndex, VectorField

from aindex.vertexai import get_text_embedding

from socialgraph.models import Profile

from ..tasks import download_file_src, extract_paper_text, update_paper_embedding
from .files import File as LibraryFile

__all__ = ['AbstractPaper', 'Paper', 'PaperAuthor', 'PaperAuthorship']

EMBEDDING_DIMENSIONS = settings.LIBRARAIN_EMBEDDING_DIMENSIONS


class AbstractPaper(models.Model):

    title = models.CharField(_('title'), max_length=255)
    abstract = models.TextField(_('abstract'), blank=True)
    raw_text = models.TextField(_('raw text'), blank=True)
    text = models.TextField(_('text'), blank=True, help_text=_('clean text'))
    tldr = models.TextField(
        _('tl;dr'),
        blank=True,
        help_text=_('short summary of the paper, usually auto-generated.'),
    )

    semantic_scholar_id = models.SlugField(_('semantic scholar ID'), blank=True, null=True, unique=True)
    arxiv_id = models.CharField(_('arXiv ID'), max_length=50, blank=True, null=True, unique=True)

    publication_year = models.PositiveIntegerField(_('year published'), null=True, blank=True)
    publication_date = models.DateField(_('date published'), null=True, blank=True)

    citation_count = models.PositiveIntegerField(_('citation count'), null=True, blank=True)

    license = models.CharField(_('license'), blank=True, max_length=255)

    embedding = VectorField(
        _('embedding'),
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True

    def load_pdf_text(self, parser=None):
        """Load the extracted PDF text to the paper's ``text`` attribute."""
        text = self.extract_pdf_text(parser=parser)
        if text:
            self.raw_text = text
            self.text = text
            type(self).objects.filter(pk=self.pk).update(raw_text=self.raw_text, text=self.text, updated_at=now())

    def generate_pdf_pages(self, parser=None):
        parser = parser or self.pdf_parser

        for page_data in parser.read_pages():
            page_text = self._sanitize_text(page_data.get('text'))
            yield page_text

    def generate_embedding(self):
        sections = [self.title, self.abstract, self.tldr, self.text]

        text = '\n\n'.join([section for section in sections if section])

        if not text:
            return None

        embedding = get_text_embedding(text)

        return embedding[0].values

    def set_embedding(self):
        self.embedding = self.generate_embedding()

    def text_processing(self):
        if self.file and not self.text:
            tasks = extract_paper_text.si(pk=self.pk) | update_paper_embedding.si(pk=self.pk)
        else:
            tasks = update_paper_embedding.si(pk=self.pk)

        return tasks

    def signal_text_extraction_done(self):
        from ..signals import paper_text_extraction_done

        paper_text_extraction_done.send(sender=self.__class__, instance=self)

    def get_post_save_tasks(self):
        """Tasks to be performed after the paper is saved

        Depending on the specific paper instance this might include

        1. Download file
        2. Extract text from file text
        3. Update embeddings
        """
        tasks = task_chain()
        new_file = False

        # Passing app_label and model_name dynamically to allow reuse in multiple models
        app_label = self._meta.app_label
        model_name = self._meta.model_name

        if not self.file and self.src_download_url:
            tasks |= download_file_src.si(pk=self.pk)
            new_file = True

        if (self.file and not self.text) or new_file:
            tasks |= extract_paper_text.si(pk=self.pk, app_label=app_label, model_name=model_name)

        tasks |= update_paper_embedding.si(pk=self.pk, app_label=app_label, model_name=model_name)

        return tasks


class PaperAuthor(Profile):

    semantic_scholar_id = models.SlugField(_('semantic scholar ID'), blank=True, null=True, unique=True)
    arxiv_id = models.CharField(_('arXiv ID'), max_length=50, blank=True, null=True, unique=True)

    citation_count = models.PositiveIntegerField(_('citation count'), null=True, blank=True)
    paper_count = models.PositiveIntegerField(_('paper count'), null=True, blank=True)
    h_index = models.PositiveIntegerField(_('h-index'), null=True, blank=True)
    affiliations = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('affiliations'),
    )

    class Meta:
        verbose_name = _('Paper Author')
        verbose_name_plural = _('Papers Authors')

    def __str__(self):
        return self.name


class Paper(AbstractPaper, LibraryFile):
    """Academic Paper"""

    document_types = models.ManyToManyField(
        'library.DocumentType',
        blank=True,
        related_name='papers',
        related_query_name='paper',
        verbose_name=_('document type'),
    )

    authors = models.ManyToManyField(
        PaperAuthor,
        related_name='papers',
        related_query_name='paper',
        through='library.PaperAuthorship',
        blank=True,
        verbose_name=_('authors'),
    )

    class Meta:
        verbose_name = _('Paper')
        verbose_name_plural = _('Papers')
        indexes = [
            HnswIndex(
                name='%(app_label)s_paper_embedding_idx',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_l2_ops'],
            )
        ]

    def __str__(self):
        return self.title


class PaperAuthorship(models.Model):
    author = models.ForeignKey(
        PaperAuthor,
        on_delete=models.CASCADE,
        related_name='authorships',
        related_query_name='authorship',
        verbose_name=_('author'),
    )

    paper = models.ForeignKey(
        Paper,
        on_delete=models.CASCADE,
        related_name='authorships',
        related_query_name='authorship',
        verbose_name=_('paper'),
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

    class Meta:
        verbose_name = _('Paper Authorship')
        verbose_name_plural = _('Paper Authorships')
        constraints = [models.UniqueConstraint(fields=['author', 'paper'], name='library_authorship_author_paper_key')]

    def __str__(self):
        author_name = self.author.name
        paper_title = self.paper.title
        return f'{author_name}: {paper_title}'

    @property
    def paper_uuid(self):
        return self.paper.uuid

    @property
    def paper_title(self):
        return self.paper.title

    @property
    def paper_file(self):
        return self.paper.file

    @property
    def publication_year(self):
        return self.paper.publication_year
