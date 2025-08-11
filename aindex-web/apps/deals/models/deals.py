import logging
import uuid
from pathlib import Path
from urllib.parse import urljoin

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.core.files.storage import FileSystemStorage
from django.core.validators import FileExtensionValidator
from django.db import models, transaction
from django.db.models import Q
from django.db.models.functions import Lower
from django.db.models.utils import resolve_callables
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

from companies.models import Company
from django_countries.fields import CountryField
from imagekit.models import ImageSpecField
from pilkit.processors import ResizeToFit

from aindex.affinity import AffinityAPI
from aindex.parsers import get_pdf_parser_class

from ..files.storage import deck_file_path, deck_page_screenshot_path, decks_file_storage
from ..managers import MailboxDeckManager
from ..tasks import ingest_deck, process_deck

__all__ = ["Industry", "Deal", "FundingRound", "Deck", "DeckPage",
           "DualUseCategory", "DualUseSignal", "FounderSignal", "ProcessingStatus"]

logger = logging.getLogger(__name__)

PRE_SEED_STAGE = 'pre-seed'
SEED_STAGE = 'seed'
SEED_PLUS_STAGE = 'seed+'
SERIES_A_STAGE = 'series-a'
SERIES_B_STAGE = 'series-b'
SERIES_C_STAGE = 'series-c'
BEYOND_SERIES_C_STAGE = 'beyond-series-c'

FUNDING_STAGE_CHOICES = (
    (PRE_SEED_STAGE, _('pre-seed')),
    (SEED_STAGE, _('seed')),
    (SEED_PLUS_STAGE, _('seed+')),
    (SERIES_A_STAGE, _('series A')),
    (SERIES_B_STAGE, _('series B')),
    (SERIES_C_STAGE, _('series C')),
    (BEYOND_SERIES_C_STAGE, _('beyond series C'))
)


class ProcessingStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    STARTED = 'STARTED', _('Started processing')
    SUCCESS = 'SUCCESS', _('Successful')
    FAILURE = 'FAILURE', _('Failed')
    RETRY = 'RETRY', _('Retrying')
    REVOKED = 'REVOKED', _('Revoked')


class Industry(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, blank=True)
    description = models.TextField(_('description'), blank=True)
    is_core = models.BooleanField(_('core'), default=False)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_industries',
        related_query_name='created_industry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Industry')
        verbose_name_plural = _('Industries')

    def __str__(self):
        return self.name


class Deal(models.Model):
    PREP_TO_CALL = 'prep to call'
    PREP_TO_PASS = 'prep to pass'
    RECOMMENDATION_CHOICES = {
        PREP_TO_CALL: _('prep to call'),
        PREP_TO_PASS: _('prep to pass'),
    }

    TOP_1_PERCENT = 'top 1%'
    TOP_5_PERCENT = 'top 5%'
    TOP_10_PERCENT = 'top 10%'
    TOP_20_PERCENT = 'top 20%'
    TOP_50_PERCENT = 'top 50%'

    QUALITY_PERCENTILE_CHOICES = {
        TOP_1_PERCENT: _('most interesting'),
        TOP_5_PERCENT: _('very interesting'),
        TOP_10_PERCENT: _('interesting'),
        TOP_20_PERCENT: _('potentially interesting'),
        TOP_50_PERCENT: _('not interesting'),
    }

    EXCELLENT = 'excellent'
    GOOD = 'good'
    AVERAGE = 'average'
    BELOW_AVERAGE = 'below average'

    NON_NUMERIC_SCORE_CHOICES = {
        EXCELLENT: _('Excellent'),
        GOOD: _('Good'),
        AVERAGE: _('Average'),
        BELOW_AVERAGE: _('Below average')
    }

    HIGH = 'high'
    LOW = 'low'

    CONFIDENCE_CHOICES = {
        HIGH: _('High'),
        LOW: _('Low')
    }

    PROCESSING_STATUS = ProcessingStatus

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    company = models.ForeignKey(
        'companies.Company',
        related_name='deals',
        related_query_name='deal',
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name=_('company')
    )
    company_name = models.CharField(_('company name'), max_length=255, blank=True)

    name = models.CharField(_('name'), max_length=255, blank=True)

    description = models.TextField(_('description'), blank=True)
    website = models.URLField(_('website'), blank=True)
    has_veteran_founder = models.BooleanField(_('has veteran founder'), null=True, blank=True)

    company_duns = models.IntegerField(_('D-U-N-S number'), blank=True, null=True)
    company_nid = models.IntegerField(_('Company NID'), blank=True, null=True)

    address_line_1 = models.CharField(_('address line 1'), max_length=255, blank=True)
    address_line_2 = models.CharField(_('address line 2'), max_length=255, blank=True)

    country = CountryField(_('country'), blank=True)
    city = models.CharField(_('city'), max_length=255, blank=True)
    state = models.CharField(_('state'), max_length=255, blank=True)
    postal_code = models.CharField(_('postal/zip code'), max_length=255, blank=True)

    stage = models.CharField(
        _('stage'),
        choices=FUNDING_STAGE_CHOICES,
        max_length=255,
        blank=True
    )

    funding_target = models.DecimalField(
        _('funding target (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    funding_raised = models.DecimalField(
        _('funding raised (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    investors_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('investor names')
    )

    industries = models.ManyToManyField(
        Industry,
        related_name='deals',
        related_query_name='deal',
        verbose_name=_('industries'),
        blank=True
    )

    founder_signals = models.ManyToManyField(
        'FounderSignal',
        related_name='deals',
        related_query_name='deal',
        verbose_name=_('founder signals'),
        blank=True
    )

    dual_use_signals = models.ManyToManyField(
        'DualUseSignal',
        related_name='deals',
        related_query_name='deal',
        verbose_name=_('dual use signals'),
        blank=True
    )

    partners_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('partners names')
    )

    customers_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('customers names')
    )

    sent_to_affinity = models.BooleanField(_('sent to affinity'), null=True, blank=True)
    affinity_organization_id = models.IntegerField(_('affinity organization ID'), null=True, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_deals',
        related_query_name='created_deal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    pros = models.TextField(_('pros'), blank=True)
    cons = models.TextField(_('cons'), blank=True)
    quality_percentile = models.CharField(
        _('quality percentile'),
        choices=QUALITY_PERCENTILE_CHOICES,
        max_length=50,
        blank=True
    )
    recommendation = models.CharField(
        _('recommendation'),
        choices=RECOMMENDATION_CHOICES,
        max_length=50,
        blank=True
    )
    investment_rationale = models.TextField(_('investment rationale'), blank=True)
    problem = models.TextField(_('problem'), blank=True)
    solution = models.TextField(_('product/solution'), blank=True)
    thesis_fit = models.TextField(_('thesis fit'), blank=True)
    traction = models.TextField(_('traction'), blank=True)
    intellectual_property = models.TextField(_('intellectual property'), blank=True)
    business_model = models.TextField(_('business model'), blank=True)
    market_sizing = models.TextField(_('market sizing'), blank=True)
    competition = models.TextField(_('competition'), blank=True)

    auto_pros = models.TextField(_('pros (automated)'), blank=True)
    auto_cons = models.TextField(_('cons (automated)'), blank=True)
    auto_recommendation = models.CharField(
        _('recommendation (automated)'),
        choices=RECOMMENDATION_CHOICES,
        max_length=50,
        blank=True
    )
    auto_quality_percentile = models.CharField(
        _('quality percentile (automated)'),
        choices=QUALITY_PERCENTILE_CHOICES,
        max_length=50,
        blank=True
    )
    auto_numeric_score = models.FloatField(_('numeric score (automated)'), blank=True, null=True)
    auto_non_numeric_score = models.CharField(
        _('non numeric score (automated)'),
        choices=NON_NUMERIC_SCORE_CHOICES,
        max_length=50,
        blank=True
    )
    auto_confidence = models.CharField(
        _('confidence (automated)'),
        choices=CONFIDENCE_CHOICES,
        max_length=50,
        blank=True
    )

    auto_investment_rationale = models.TextField(_('investment rationale (automated)'), blank=True)
    auto_description = models.TextField(_('description (automated)'), blank=True)
    auto_problem = models.TextField(_('problem (automated)'), blank=True)
    auto_solution = models.TextField(_('product/solution (automated)'), blank=True)
    auto_thesis_fit = models.TextField(_('thesis fit (automated)'), blank=True)
    auto_thesis_fit_score = models.FloatField(_('thesis fit score (automated)'), blank=True, null=True)
    auto_traction = models.TextField(_('traction (automated)'), blank=True)
    auto_intellectual_property = models.TextField(_('intellectual property (automated)'), blank=True)
    auto_business_model = models.TextField(_('business model (automated)'), blank=True)
    auto_market_sizing = models.TextField(_('market_sizing (automated)'), blank=True)
    auto_competition = models.TextField(_('competition (automated)'), blank=True)

    tags = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('tags')
    )

    processing_status = models.CharField(
        _('processing status'),
        choices=PROCESSING_STATUS,
        blank=True,
        max_length=128,
    )

    class Meta:
        verbose_name = _('Deal')
        verbose_name_plural = _('Deals')
        indexes = [
            GinIndex(
                SearchVector('name', 'company_name', config='english'),
                name='search_vector_idx'
            )
        ]

    def __str__(self):
        return self.display_name

    def save(self, *args, **kwargs):

        if not self.company:
            self.set_company()

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('deals:deal-detail', kwargs={'uuid': self.uuid})

    @property
    def display_name(self):
        return self.company_name or self.name or str(self.uuid)

    @property
    def sbir_url(self):
        if self.company_nid:
            return f'https://www.sbir.gov/portfolio/{self.company_nid}'

    @property
    def decks_ready(self):
        return not self.decks.filter(ingestion_status__in=[Deck.PENDING, Deck.STARTED, Deck.RETRY]).exists()

    @property
    def is_ready(self):
        return self.processing_status not in [
            ProcessingStatus.PENDING,
            ProcessingStatus.STARTED,
            ProcessingStatus.RETRY,
        ] and self.decks_ready

    def set_company(self, **kwargs):
        """Prepare the company object and link it with the deal.

        Creates the new company if it does not exist yet.

        Args:
            kwargs:
                values used for company lookup. If not provided the company will be looked up using either
                company nid , website or name.
        """

        attrs = {
            'name': self.company_name,
            'summary': self.description,
            'website': self.website or None,
            'duns': self.company_duns,
            'nid': self.company_nid,
            'hq_country': self.country,
            'hq_state_name': self.state,
            'hq_city_name': self.city,
            'address_line_1': self.address_line_1,
            'address_line_2': self.address_line_2,
            'hq_postal_code': self.postal_code
        }

        update_attrs = {
            field_name: field_value for field_name, field_value in attrs.items()
            if field_value not in [None, '', {}, []]
        }

        or_kwargs = {}
        if self.company_nid:
            or_kwargs['nid'] = self.company_nid
        if self.website:
            or_kwargs['website'] = self.website
        if self.company_name:
            or_kwargs['name'] = self.company_name

        query = Q(**kwargs)
        for k, v in or_kwargs.items():
            query |= Q(**{k: v})

        try:
            company = Company.objects.filter(query).get()
            for k, v in resolve_callables(update_attrs):
                setattr(company, k, v)
            company.save(update_fields=[*update_attrs.keys(), 'updated_at'])
        except Company.DoesNotExist:
            company = Company.objects.create(**attrs)
        except Company.MultipleObjectsReturned:
            # probably due to not enough info related to a company.
            # For example when a deal was just created from a deck
            return

        self.company = company

    def compose_affinity_note(self):
        content = render_to_string(
            template_name='deals/includes/deal_affinity_note.html',
            context={
                'deal': self,
                'site_url': settings.SITE_URL,
                'deal_url': urljoin(settings.SITE_URL, self.get_absolute_url())
            }
        )
        return content

    def get_affinity_organization(self, client=None):
        affinity = client or AffinityAPI()

        # search organization using website
        if self.website:
            orgs = affinity.search_organizations(term=self.website)
            if orgs['organizations']:
                return orgs['organizations'][0]

        # search organization using name
        if self.company_name:
            orgs = affinity.search_organizations(term=self.company_name)
            if orgs['organizations']:
                return orgs['organizations'][0]

        # nothing matched
        return None

    def send_to_affinity(self, list_id=None, list_field_id=None, list_field_status_id=None):
        """Send deal to affinity"""

        affinity = AffinityAPI()

        list_id = list_id or settings.AFFINITY_DEALS_LIST_ID
        list_field_id = list_field_id or settings.AFFINITY_DEALS_LIST_FIELD_ID
        list_field_status_id = list_field_status_id or settings.AFFINITY_DEALS_LIST_FIELD_STATUS_ID
        organization = self.get_affinity_organization(client=affinity)

        if not organization:
            self.sent_to_affinity = False
            self.save()
            return

        # create organization list entry
        list_entry = affinity.create_list_entry(list_id=list_id, entity_id=organization['id'])

        # get organization status entry value
        field_values = affinity.get_field_values(list_entry_id=list_entry['id'])
        old_status_value = None
        for field_value in field_values:
            if field_value['field_id'] == list_field_id:
                old_status_value = field_value
                break

        if old_status_value:
            # update organization status field value
            entry_status = affinity.update_field_value(
                field_value_id=old_status_value['id'],
                value=list_field_status_id
            )
        else:
            # create organization status field value
            entry_status = affinity.create_field_value(
                field_id=list_field_id,
                value=list_field_status_id,
                entity_id=organization['id'],
                list_entry_id=list_entry['id']
            )

        # create notes on the organization
        content = self.compose_affinity_note()
        note = affinity.create_note(
            content,
            organization_ids=[organization['id']],
            note_type=2  # HTML
        )

        # upload decks
        decks = self.decks.exclude(file=None)
        deck_upload = []
        for deck in decks:
            deck_file = (
                deck.file_name,
                deck.file.open('rb'),
                f'application/{deck.file_format.lower()}'
            )

            deck_upload_response = affinity.upload_entity_files(
                file=deck_file,
                organization_id=organization['id']
            )

            if isinstance(deck_upload_response, dict):
                deck_upload_response['deck_id'] = deck.id

            deck_upload.append(deck_upload_response)

        # update deal in the DB
        self.sent_to_affinity = True
        self.affinity_organization_id = organization['id']
        self.save()

        return {
            'organization': organization,
            'list_entry': list_entry,
            'status': entry_status,
            'note': note,
            'deck_upload': deck_upload
        }


class FundingRound(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    deal = models.ForeignKey(
        Deal,
        related_name='funding_rounds',
        related_query_name='funding_round',
        on_delete=models.CASCADE,
        verbose_name=_('deal')
    )
    stage = models.CharField(
        _('name/stage'),
        choices=FUNDING_STAGE_CHOICES,
        max_length=255,
        blank=True
    )
    date = models.DateField(_('date'), blank=True, null=True)
    description = models.TextField(_('description'), blank=True)

    target_amount = models.DecimalField(
        _('target amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )
    raised_amount = models.DecimalField(
        _('raised amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    investors_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('investor names')
    )

    is_active = models.BooleanField(_('is active'), default=True, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_funding_rounds',
        related_query_name='created_funding_round',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Funding Round')
        verbose_name_plural = _('Funding Rounds')

    def __str__(self):
        return self.stage


class Deck(models.Model):

    PDF = 'PDF'

    FILE_FORMAT_CHOICES = (
        (PDF, _('PDF')),
    )

    PDF_EXTENSION = 'pdf'
    ALLOWED_FILE_EXTENSIONS = [
        PDF_EXTENSION
    ]

    PENDING = 'PENDING'
    STARTED = 'STARTED'
    SUCCESS = 'SUCCESS'
    FAILURE = 'FAILURE'
    RETRY = 'RETRY'
    REVOKED = 'REVOKED'

    INGESTION_STATUS_CHOICES = (
        (PENDING, _('Pending')),
        (STARTED, _('Started processing')),
        (SUCCESS, _('Successful')),
        (FAILURE, _('Failed')),
        (RETRY, _('Retrying')),
        (REVOKED, _('Revoked'))
    )

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    deal = models.ForeignKey(
        Deal,
        related_name='decks',
        related_query_name='deck',
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name=_('deal')
    )
    title = models.CharField(_('title'), max_length=255, blank=True)
    subtitle = models.CharField(_('subtitle'), max_length=255, blank=True)

    file = models.FileField(
        _('file'),
        storage=decks_file_storage,
        max_length=255,
        upload_to=deck_file_path,
        validators=[FileExtensionValidator(ALLOWED_FILE_EXTENSIONS)],
    )

    file_format = models.CharField(
        _('file format'),
        choices=FILE_FORMAT_CHOICES,
        max_length=255,
        blank=True,
        default=PDF
    )

    ingestion_status = models.CharField(
        _('ingestion status'),
        choices=INGESTION_STATUS_CHOICES,
        default=PENDING,
        max_length=255,
        blank=True
    )

    ingestion_task_id = models.CharField(
        _('ingestion task ID'),
        blank=True,
        max_length=255,
        db_index=True
    )

    text = models.TextField(_('text'), blank=True)

    is_from_mailbox = models.BooleanField(_('is from mailbox'), blank=True, default=False, db_index=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_decks',
        related_query_name='created_deck',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )
    extras = models.JSONField(_('extras'), default=dict, blank=True)

    objects = models.Manager()
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
        if is_new and self.file and self.file_format == self.PDF:
            transaction.on_commit(lambda: self._ingest_deck())

    @property
    def file_name(self):
        return Path(self.file.name).name

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

    def load_pdf_text(self, parser=None):
        parser = parser or self.pdf_parser
        self.text = self._clean_str(parser.extract_text())

    def generate_pdf_pages(self, parser=None):
        parser = parser or self.pdf_parser

        for page_data in parser.read_pages():
            page_text = self._clean_str(page_data.get('text'))
            yield DeckPage(
                deck=self,
                page_number=page_data.get('page_number'),
                text=page_text
            )

    def build_deal(self):
        return Deal(name=self.default_deal_name)

    def _ingest_deck(self):
        return (ingest_deck.si(self.pk) | process_deck.si(self.pk)).delay()

    @staticmethod
    def _clean_str(text):
        text = text or ''

        # Avoid "psycopg.DataError: PostgreSQL text fields cannot contain NUL (0x00) bytes"
        text = text.replace('\x00', '')

        return text


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
        verbose_name=_('deck')
    )
    page_number = models.IntegerField(_('page number'), blank=True, null=True)
    title = models.CharField(_('name'), max_length=255, blank=True)
    text = models.TextField(_('text'), blank=True)

    screenshot = models.ImageField(
        _('screenshot'),
        storage=decks_file_storage,
        upload_to=deck_page_screenshot_path,
        blank=True,
        null=True
    )
    screenshot_xs = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(256)],
        format='PNG',
        options={'quality': 90}
    )
    screenshot_small = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(512)],
        format='PNG',
        options={'quality': 90}
    )
    screenshot_medium = ImageSpecField(
        source='screenshot',
        processors=[ResizeToFit(1024)],
        format='PNG',
        options={'quality': 90}
    )

    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

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


class DualUseCategory(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_dual_use_categories',
        related_query_name='created_dual_use_category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Dual use category')
        verbose_name_plural = _('Dual use categories')

    def __str__(self):
        return self.name


class DualUseSignal(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    category = models.ForeignKey(
        DualUseCategory,
        related_name='signals',
        related_query_name='signal',
        verbose_name='category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_dual_use_signals',
        related_query_name='created_dual_use_signal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Dual use signal')
        verbose_name_plural = _('Dual use signals')
        constraints = [
            models.UniqueConstraint(
                Lower('name').desc(),
                name='unique_name_lower',
                violation_error_message=_('Dual use signal with specified name already exists')
            ),
        ]

    def __str__(self):
        return self.name


class FounderSignal(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_founder_signals',
        related_query_name='created_founder_signal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator')
    )
    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Founder signal')
        verbose_name_plural = _('Founders signals')

    def __str__(self):
        return self.name
