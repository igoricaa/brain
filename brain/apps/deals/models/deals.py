import uuid
from urllib.parse import urljoin

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import CheckConstraint, Max, Q
from django.db.models.utils import resolve_callables
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _

from aindex.affinity import AffinityAPI

from common.models import ProcessingStatus
from companies.models import Company

from .base import DealStatus

__all__ = ['Deal', 'DraftDeal', 'DraftDealManager']


class DealManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(is_draft=False)


class Deal(models.Model):

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
        on_delete=models.PROTECT,
        verbose_name=_('company'),
    )

    name = models.CharField(_('name'), max_length=255, blank=True)

    description = models.TextField(_('description'), blank=True)
    website = models.URLField(_('website'), blank=True)

    status = models.CharField(
        _('status'),
        max_length=64,
        choices=DealStatus,
        default=DealStatus.NEW,
        blank=True,
    )

    industries = models.ManyToManyField(
        'companies.Industry',
        related_name='deals',
        related_query_name='deal',
        blank=True,
        verbose_name=_('industries'),
    )

    dual_use_signals = models.ManyToManyField(
        'DualUseSignal',
        related_name='deals',
        related_query_name='deal',
        verbose_name=_('dual use signals'),
        blank=True,
    )

    funding_stage = models.ForeignKey(
        'companies.FundingStage',
        related_name='deals',
        related_query_name='deal',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('funding stage'),
    )

    funding_type = models.ForeignKey(
        'companies.FundingType',
        related_name='deals',
        related_query_name='deal',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('funding type'),
    )

    funding_target = models.DecimalField(
        _('funding target (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
    )

    funding_raised = models.DecimalField(
        _('funding raised (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
    )

    investors_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('investor names'),
    )

    partners_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('partners names'),
    )

    customers_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('customers names'),
    )

    govt_relationships = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('government relationships'),
    )

    has_civilian_use = models.BooleanField(_('has civilian use'), null=True, blank=True)

    processing_status = models.CharField(
        _('processing status'),
        choices=ProcessingStatus,
        blank=True,
        max_length=128,
    )

    sent_to_affinity = models.BooleanField(_('sent to affinity'), null=True, blank=True)

    is_draft = models.BooleanField(_('is draft'), blank=True, default=False)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_deals',
        related_query_name='created_deal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator'),
    )
    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    objects = DealManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = _('Deal')
        verbose_name_plural = _('Deals')
        default_manager_name = 'all_objects'
        constraints = [
            CheckConstraint(
                condition=~Q(company=None) | Q(is_draft=True),
                name='%(app_label)s_%(class)s_company_required_or_draft',
                violation_error_code='company_required',
                violation_error_message=_('Company is required if the deal is not a draft.'),
            ),
        ]

    def __str__(self):
        return self.display_name

    def save(self, *args, **kwargs):

        if not self.company and not self.is_draft:
            self.set_company()

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return ''

    @property
    def display_name(self):
        return self.name or self.company_name or str(self.uuid)

    @property
    def company_name(self):
        if not self.company:
            return None
        return self.company.name

    @property
    def sbir_url(self):
        if not self.company:
            return None
        return self.company.sbir_url

    @property
    def decks_ready(self):
        return not self.files.filter(
            ingestion_status__in=[
                ProcessingStatus.PENDING,
                ProcessingStatus.STARTED,
                ProcessingStatus.RETRY,
            ]
        ).exists()

    @property
    def is_ready(self):
        return (
            self.processing_status
            not in [
                ProcessingStatus.PENDING,
                ProcessingStatus.STARTED,
                ProcessingStatus.RETRY,
            ]
            and self.decks_ready
        )

    @property
    def last_assessment(self):
        return self.assessments.order_by('-created_at').first()

    def get_new_files(self):
        """Returns list of deal files added since the last assessment"""
        last_assessment = self.assessments.aggregate(created_at=Max('created_at'))
        return self.files.filter(created_at__gte=last_assessment['created_at'])

    def set_company(self, **kwargs):
        """Prepare the company object and link it with the deal.

        Creates the new company if it does not exist yet.

        Args:
            kwargs:
                values used for company lookup. If not provided the company will be looked up using either
                company nid , website or name.
        """

        attrs = {
            'name': self.name,
            'summary': self.description,
            'website': self.website or None,
        }

        update_attrs = {
            field_name: field_value
            for field_name, field_value in attrs.items()
            if field_value not in [None, '', {}, []]
        }

        or_kwargs = {}
        if self.website:
            or_kwargs['website'] = self.website
        if self.name:
            or_kwargs['name'] = self.name

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
            if not kwargs and not or_kwargs:
                company = Company.objects.create(**{'name': str(self.uuid)})
            else:
                raise

        self.company = company

    def compose_affinity_note(self):
        content = render_to_string(
            template_name='deals/includes/deal_affinity_note.html',
            context={
                'deal': self,
                'site_url': settings.SITE_URL,
                'deal_url': urljoin(settings.SITE_URL, self.get_absolute_url()),
            },
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
                field_value_id=old_status_value['id'], value=list_field_status_id
            )
        else:
            # create organization status field value
            entry_status = affinity.create_field_value(
                field_id=list_field_id,
                value=list_field_status_id,
                entity_id=organization['id'],
                list_entry_id=list_entry['id'],
            )

        # create notes on the organization
        content = self.compose_affinity_note()
        note = affinity.create_note(content, organization_ids=[organization['id']], note_type=2)  # HTML

        # upload decks
        decks = self.decks.exclude(file=None)
        deck_upload = []
        for deck in decks:
            deck_file = (deck.file_name, deck.file.open('rb'), f'application/{deck.file_format.lower()}')

            deck_upload_response = affinity.upload_entity_files(file=deck_file, organization_id=organization['id'])

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
            'deck_upload': deck_upload,
        }


class DraftDealManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(is_draft=True)


class DraftDeal(Deal):
    """Draft Deal"""

    objects = DraftDealManager()

    class Meta:
        proxy = True
        verbose_name = _('Draft Deal')
        verbose_name_plural = _('Draft Deals')

    def save(self, *args, **kwargs):
        self.is_draft = True
        super().save(*args, **kwargs)

    def finalize(self):
        """Finalize the draft deal and save it as a regular deal.

        Returns:
            Deal
        """
        deal = Deal._default_manager.get(pk=self.pk)
        deal.is_draft = False
        deal.save()
        return deal
