import json
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models, transaction
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

from imagekit.models import ImageSpecField
from pilkit.processors import ResizeToFit

from aindex.utils import get_country
from aindex.vertexai import DealAssistant

from companies.models import Founder, Founding
from library.models import AbstractPaper
from library.models import File as LibraryFile
from library.models import FileManager

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
        on_delete=models.CASCADE,
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

        return response.to_json_dict()


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
            type(self).filter(pk=self.pk).objects.update(text=self.text, updated_at=now())

        return response.to_json_dict()


class Deck(DealFile):

    PDF_EXTENSION = 'pdf'
    ALLOWED_FILE_EXTENSIONS = [PDF_EXTENSION]

    title = models.CharField(_('title'), max_length=255, blank=True)
    subtitle = models.CharField(_('subtitle'), max_length=255, blank=True)

    raw_text = models.TextField(_('raw text'), blank=True)
    text = models.TextField(_('text'), blank=True)

    is_from_mailbox = models.BooleanField(_('is from mailbox'), blank=True, default=False, db_index=True)

    objects = FileManager()
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
            type(self).objects.filter(pk=self.pk).update(raw_text=self.raw_text, updated_at=now())

    def clean_raw_text(self):
        if not self.raw_text:
            return None

        assistant = DealAssistant()
        response = assistant.clean_deck(self.raw_text)
        response_data = json.loads(response.text)

        text = response_data.get('text')

        if text:
            self.text = text
            type(self).objects.filter(pk=self.pk).update(text=self.text, updated_at=now())

        return response.to_json_dict()

    def gen_deal_info(self):
        assistant = DealAssistant()
        response = assistant.gen_deck_basic_info(self.text)
        response_data = json.loads(response.text)

        deck_updates = {}
        deal_updates = {}
        company_updates = {}

        company_name = response_data.get('company_name')
        if company_name:
            deck_updates['title'] = company_name
            deal_updates['name'] = company_name
            company_updates['name'] = company_name

        website = response_data.get('website')
        if website:
            deal_updates['website'] = website
            company_updates['website'] = website

        location = response_data.get('location') or {}
        country = location.get('country')
        if country:
            try:
                country = get_country(country)
                company_updates['hq_country'] = country.alpha_2
            except LookupError:
                pass
        state = location.get('state')
        if state:
            company_updates['hq_state_name'] = state
        city = location.get('city')
        if state:
            company_updates['hq_city_name'] = city

        # update deck
        deck_updates = {k: v for k, v in deck_updates.items() if not getattr(self, k, None)}
        if deck_updates:
            type(self).objects.filter(pk=self.py).update(updated_at=now(), **deck_updates)

        # update deal
        if self.deal:
            deal_updates = {k: v for k, v in deal_updates.items() if not getattr(self.deal, k, None)}
            if deal_updates:
                type(self.deal)._default_manager.filter(pk=self.deal.pk).update(updated_at=now(), **deal_updates)

        # update company
        if self.deal and self.deal.company:
            company_updates = {k: v for k, v in company_updates.items() if not getattr(self.deal.company, k, None)}
            if company_updates:
                type(self.deal.company).objects.filter(pk=self.deal.company.pk).update(
                    updated_at=now(), **company_updates
                )
        elif self.deal:
            self.deal.set_company(defaults=company_updates)
            type(self.deal)._default_manager.filter(pk=self.deal.pk).update(
                updated_at=now(), company=self.deal.company
            )

        # update company founders
        founders = response_data.get('founders') or []
        for founder_attrs in founders:
            founder_name = founder_attrs.get('name', '')
            founder_bio = founder_attrs.get('bio', '')

            founder, founder_created = Founder.objects.update_or_create(
                company=self.deal.company,
                name=founder_name,
                defaults={
                    'name': founder_name,
                    'bio': founder_bio,
                },
            )
            founder_attrs['founder'] = founder

        for founder_attrs in founders:
            founder = founder_attrs.get('founder', '')
            founder_title = founder_attrs.get('title', '')

            Founding.objects.update_or_create(
                company=self.deal.company,
                founder=founder,
                defaults={
                    'founder': founder,
                    'company': self.deal.company,
                    'title': founder_title,
                },
            )

        return response.to_json_dict()

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
