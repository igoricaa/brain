import hashlib
import uuid
from pathlib import Path

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.files import File
from django.core.files.storage import FileSystemStorage
from django.core.files.temp import NamedTemporaryFile
from django.core.validators import FileExtensionValidator
from django.db import models, transaction
from django.db.models import ManyToManyField
from django.db.models.functions import Now
from django.utils.functional import cached_property
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import requests
from imagekit.models import ImageSpecField
from pgvector.django import HnswIndex, VectorField
from pilkit.processors import ResizeToFit

from aindex.parsers import get_pdf_parser_class
from aindex.utils import get_requests_filename
from aindex.vertexai import get_text_embedding

from ..files import document_file_path, documents_file_storage, source_image_path
from ..tasks import (load_document_sections, save_document_src_file, save_document_text, update_document_embedding,
                     update_document_section_embedding)

__all__ = [
    'Category',
    'DocumentType',
    'Source',
    'Author',
    'Document',
    'DocumentSection',
    'Citation',
]

EMBEDDING_DIMENSIONS = settings.LIBRARAIN_EMBEDDING_DIMENSIONS


class Category(models.Model):
    """Content category"""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    code = models.SlugField('code', max_length=50, blank=True, null=False, unique=True)

    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True,
        db_default=Now(),
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict
    )

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')

    def __str__(self):
        return self.name


class DocumentType(models.Model):
    """Document Type"""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    code = models.SlugField('code', max_length=50, blank=True, null=False, unique=True)

    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True,
        db_default=Now(),
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict
    )

    class Meta:
        verbose_name = _('Document Type')
        verbose_name_plural = _('Document Types')

    def __str__(self):
        return self.name


class Source(models.Model):
    """Documents Source"""

    uuid = models.UUIDField(_('UUID'), default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(_('name'), max_length=255)
    code = models.SlugField('code', max_length=50, blank=True, null=False, unique=True)
    website = models.URLField(_('website URL'), blank=True)
    description = models.TextField(_('description'), blank=True)

    image = models.ImageField(
        _('image or logo'),
        upload_to=source_image_path,
        blank=True,
        null=True
    )
    image_small = ImageSpecField(
        source='image',
        processors=[ResizeToFit(50, 50)],
        format='PNG',
        options={'quality': 80}
    )
    image_medium = ImageSpecField(
        source='image',
        processors=[ResizeToFit(250, 170)],
        format='PNG',
        options={'quality': 80}
    )
    image_large = ImageSpecField(
        source='image',
        processors=[ResizeToFit(700)],
        options={'quality': 100}
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
        default=dict
    )

    class Meta:
        verbose_name = _('Source')
        verbose_name_plural = _('Sources')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.code = self.code or str(self.uuid)
        super().save(*args, **kwargs)

    @cached_property
    def image_url(self):
        if not self.image:
            return None
        return self.image.url

    @cached_property
    def image_small_url(self):
        if not self.image:
            return None
        return self.image_small.url

    @cached_property
    def image_medium_url(self):
        if not self.image:
            return None
        return self.image_medium.url

    @cached_property
    def image_large_url(self):
        if not self.image:
            return None
        return self.image_large.url


class Author(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    name = models.CharField(_('name'), max_length=255, blank=True)

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

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict,
    )

    class Meta:
        verbose_name = _('Author')
        verbose_name_plural = _('Authors')

    def __str__(self):
        return self.name


class Document(models.Model):
    """Document"""

    ALLOWED_FILE_EXTENSIONS = [
        'doc',
        'docx',
        'html',
        'md',
        'odt',
        'pdf',
        'rst',
        'tex',
        'txt'
    ]

    uuid = models.UUIDField(_('UUID'), default=uuid.uuid4, editable=False, unique=True)
    title = models.CharField(_('title'), max_length=255)
    abstract = models.TextField(_('abstract'), blank=True)
    text = models.TextField(_('text'), blank=True)
    tldr = models.TextField(
        _('tl;dr'),
        blank=True,
        help_text=_('auto-generated short summary of the paper.'),
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='document',
        related_query_name='documents',
        verbose_name=_('source'),
    )

    document_types = models.ManyToManyField(
        DocumentType,
        blank=True,
        related_name='document',
        related_query_name='documents',
        verbose_name=_('document type'),
    )

    categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name='document',
        related_query_name='documents',
        verbose_name=_('categories'),
    )

    src_id = models.CharField(_('external ID'), max_length=255, blank=True)
    src_url = models.URLField(_('external URL'), blank=True)
    src_download_url = models.URLField(_('external download URL'), blank=True)

    semantic_scholar_id = models.SlugField(_('semantic scholar ID'), blank=True, null=True, unique=True)
    arxiv_id = models.CharField(_('arXiv ID'), max_length=50, blank=True, null=True, unique=True)

    publication_year = models.PositiveIntegerField(_('year published'), null=True, blank=True)
    publication_date = models.DateField(_('date published'), null=True, blank=True)

    file = models.FileField(
        _('file'),
        storage=documents_file_storage,
        upload_to=document_file_path,
        validators=[FileExtensionValidator(ALLOWED_FILE_EXTENSIONS)],
        max_length=255,
        blank=True,
    )

    tags = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('tags')
    )

    authors = ManyToManyField(
        Author,
        related_name='documents',
        related_query_name='document',
        blank=True,
        verbose_name=_('authors'),
    )

    license = models.CharField(_('license'), blank=True, max_length=255)

    embedding = VectorField(
        _('embedding'),
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
    )

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_documents',
        related_query_name='created_document',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('creator')
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
        verbose_name = _('Document')
        verbose_name_plural = _('Documents')
        indexes = [
            HnswIndex(
                name='%(app_label)s_doc_embedding_idx',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_l2_ops']
            )
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        transaction.on_commit(lambda: self.process_text().delay())

    def save_src_file(self):
        """Download and save document file from an external url.

        Returns: str
            Link to the saved file.
        """

        if not self.src_download_url:
            return None

        r = requests.get(self.src_download_url, stream=True)

        with NamedTemporaryFile('wb+', delete=True) as f:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
            f.seek(0)

            file_name = get_requests_filename(r) or '%s.pdf' % (
                hashlib.md5(self.src_download_url.encode('utf-8')).hexdigest(),
            )

            document_file = File(f)
            self.file.save(file_name, document_file, save=False)

        self.__class__.objects.filter(pk=self.pk).update(file=self.file, updated_at=now())
        return self.file.url

    @cached_property
    def pdf_parser(self):
        parser_class = get_pdf_parser_class()

        if isinstance(self.file.storage, FileSystemStorage):
            path = Path(self.file.path)
        else:
            # GCS
            path = f'gs://{self.file.storage.bucket_name}/{self.file.file.name}'

        parser = parser_class(path)
        return parser

    def extract_pdf_text(self, parser=None):
        parser = parser or self.pdf_parser
        text = self._clean_str(parser.extract_text())
        return text

    def load_pdf_text(self, parser=None):
        self.text = self.extract_pdf_text(parser=parser)

    def extract_text_sections(self, parser=None):
        parser = parser or self.pdf_parser

        for _section in parser.read_text_blocks():
            text = self._clean_str(_section['text'].strip())

            if not text or len(text) < 10:
                continue

            _section['text'] = text

            yield _section

    def load_text_sections(self, parser=None):
        self.sections.all().delete()

        for _section in self.extract_text_sections(parser=parser):

            self.sections.create(
                text=_section['text'],
                page_number=_section['page_number'],
                index_number=_section['index_number'],
            )

    def generate_pdf_pages(self, parser=None):
        parser = parser or self.pdf_parser

        for page_data in parser.read_pages():
            page_text = self._clean_str(page_data.get('text'))
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

    def process_text(self):
        if not self.file and self.src_download_url:
            tasks = (
                save_document_src_file.si(pk=self.pk)
                | save_document_text.si(pk=self.pk)
                | update_document_embedding.si(pk=self.pk)
            )
        elif self.file and not self.text:
            tasks = save_document_text.si(pk=self.pk) | update_document_embedding.si(pk=self.pk)
        else:
            tasks = update_document_embedding.si(pk=self.pk)

        return tasks | load_document_sections.si(pk=self.pk)

    @staticmethod
    def _clean_str(text):
        text = text or ''

        # Avoid "psycopg.DataError: PostgreSQL text fields cannot contain NUL (0x00) bytes"
        text = text.replace('\x00', '')

        return text


class DocumentSection(models.Model):
    document = models.ForeignKey(
        Document,
        related_name='sections',
        related_query_name='section',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('document'),
    )

    text = models.TextField(_('text'), blank=True)

    page_number = models.IntegerField(_('page number'), null=True, blank=True)
    index_number = models.IntegerField(_('index number'), null=True, blank=True)

    embedding = VectorField(
        _('embedding'),
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
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
        verbose_name = _('Document Section')
        verbose_name_plural = _('Documents Sections')
        indexes = [
            HnswIndex(
                name='%(app_label)s_docsec_embedding_idx',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_l2_ops']
            )
        ]

    def __str__(self):
        return self.text[:50]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        transaction.on_commit(lambda: self.process_text().delay())

    def generate_embedding(self):
        if not self.text:
            return None

        embedding = get_text_embedding(self.text)

        return embedding[0].values

    def set_embedding(self):
        self.embedding = self.generate_embedding()

    def process_text(self):
        return update_document_section_embedding.si(pk=self.pk)


class Citation(models.Model):

    citing_document = models.ForeignKey(
        Document,
        related_name='references',
        related_query_name='reference',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('citing document'),
    )

    cited_document = models.ForeignKey(
        Document,
        related_name='citations',
        related_query_name='citation',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('cited document'),
    )

    year = models.PositiveIntegerField(_('year'), null=True, blank=True)

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict
    )

    class Meta:
        verbose_name = _('Citation')
        verbose_name_plural = _('Citations')
