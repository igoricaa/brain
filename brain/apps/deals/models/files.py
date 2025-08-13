import json
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models, transaction
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

from imagekit.models import ImageSpecField
from pilkit.processors import ResizeToFit
from polymorphic.managers import PolymorphicManager

from aindex.vertexai import DealAssistant

from library.models import AbstractPaper
from library.models import File as LibraryFile

from ..managers import MailboxDeckManager
from ..storage import deck_page_screenshot_path, decks_file_storage
from .deals import Deal

__all__ = ["DealFile", "Paper", "Deck", "DeckPage"]

EMBEDDING_DIMENSIONS = settings.LIBRARAIN_EMBEDDING_DIMENSIONS


class DealFile(LibraryFile):

    deal = models.ForeignKey(
        'deals.Deal',
        related_name='files',
        related_query_name='file',
        blank=True,
        on_delete=models.PROTECT,
        verbose_name=_('deal'),
    )

    description = models.TextField(_('description'), blank=True)

    processing_task_id = models.CharField(_('processing task ID'), blank=True, max_length=255)

    class Meta:
        verbose_name = _('Deal File')
        verbose_name_plural = _('Deal Files')

    def classify_file(self):
        """Classify deal file and convert it to a more appropriate instance."""

        if self.mime_type == 'application/pdf':
            text = self.extract_pdf_text()
        else:
            return None

        assistant = DealAssistant()
        response = assistant.classify_document(text)
        response_data = json.loads(response.text)

        document_type = response_data.get('document_type')
        title = response_data.get('title') or ''
        _defaults = {'title': title, 'raw_text': text}

        if document_type == 'deck':
            Deck.objects.convert(self, defaults=_defaults)
        elif document_type == 'paper':
            Paper.objects.convert(self, defaults=_defaults)

        return response.json()


class Paper(AbstractPaper, DealFile):
    """Deal Academic Paper"""

    document_types = models.ManyToManyField(
        'library.DocumentType',
        blank=True,
        related_name='deals_papers',
        related_query_name='deal_paper',
        verbose_name=_('document type'),
    )

    authors = models.ManyToManyField(
        'library.PaperAuthor',
        related_name='deals_papers',
        related_query_name='deal_paper',
        blank=True,
        verbose_name=_('authors'),
    )

    class Meta:
        verbose_name = _('Deal Paper')
        verbose_name_plural = _('Deals Papers')

    def __str__(self):
        return self.title

    def clean_raw_text(self):
        if not self.raw_text:
            return None

        assistant = DealAssistant()
        response = assistant.clean_document(self.raw_text)
        response_data = json.loads(response.text)

        text = response_data.get('text')

        if text:
            self.text = text
            type(self).objects.update(text=self.text, updated_at=now())

        return response.json()


class Deck(DealFile):

    PDF_EXTENSION = 'pdf'
    ALLOWED_FILE_EXTENSIONS = [PDF_EXTENSION]

    title = models.CharField(_('title'), max_length=255, blank=True)
    subtitle = models.CharField(_('subtitle'), max_length=255, blank=True)

    raw_text = models.TextField(_('raw text'), blank=True)
    text = models.TextField(_('text'), blank=True)

    is_from_mailbox = models.BooleanField(_('is from mailbox'), blank=True, default=False, db_index=True)

    objects = PolymorphicManager()
    from_mailbox = MailboxDeckManager()

    class Meta:
        verbose_name = _('Deck')
        verbose_name_plural = _('Decks')

    def __str__(self):
        return self.display_name

    def save(self, *args, **kwargs):
        is_new = not bool(self.id)
        super().save(*args, **kwargs)

        # Process newly created deck
        if is_new and self.file:
            transaction.on_commit(lambda: self._ingest_deck())

    @property
    def file_stem(self):
        return Path(self.file.name).stem

    @property
    def display_name(self):
        if self.title:
            return self.title
        else:
            return self.file_name

    @property
    def default_deal_name(self):
        if self.title:
            return self.title
        else:
            return self.file_stem

    def load_text(self):
        text = self.extract_pdf_text()

        if text:
            self.raw_text = text
            type(self).objects.update(raw_text=self.raw_text, updated_at=now())

    def clean_raw_text(self):
        if not self.raw_text:
            return None

        assistant = DealAssistant()
        response = assistant.clean_deck(self.raw_text)
        response_data = json.loads(response.text)

        text = response_data.get('text')

        if text:
            self.text = text
            type(self).objects.update(text=self.text, updated_at=now())

        return response.json()

    def generate_pdf_pages(self, parser=None):
        parser = parser or self.pdf_parser

        for page_data in parser.read_pages():
            page_text = self._clean_str(page_data.get('text'))
            yield DeckPage(deck=self, page_number=page_data.get('page_number'), text=page_text)

    def build_deal(self):
        return Deal(name=self.default_deal_name)

    def _ingest_deck(self):
        # return (ingest_deck.si(self.pk) | process_deck.si(self.pk)).delay()
        pass


class DeckPage(models.Model):

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    deck = models.ForeignKey(
        Deck,
        related_name='pages',
        related_query_name='page',
        on_delete=models.CASCADE,
        verbose_name=_('deck'),
    )
    page_number = models.IntegerField(_('page number'), blank=True, null=True)
    title = models.CharField(_('name'), max_length=255, blank=True)
    text = models.TextField(_('text'), blank=True)

    screenshot = models.ImageField(
        _('screenshot'),
        storage=decks_file_storage,
        upload_to=deck_page_screenshot_path,
        blank=True,
        null=True,
    )
    screenshot_xs = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(256)],
        format='PNG',
        options={'quality': 90},
    )
    screenshot_small = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(512)],
        format='PNG',
        options={'quality': 90},
    )
    screenshot_medium = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(1024)],
        format='PNG',
        options={'quality': 90},
    )

    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Deck Page')
        verbose_name_plural = _('Decks Pages')

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        if self.title:
            return self.title

        if self.text:
            return f'{self.text[:50]}...'

        if self.page_number:
            return f'Page {self.page_number}'

        return str(self.uuid)
