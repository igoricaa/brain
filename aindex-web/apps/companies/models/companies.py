import hashlib
import json
import logging
import mimetypes
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.postgres.fields import ArrayField, DecimalRangeField, IntegerRangeField
from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.files.temp import NamedTemporaryFile
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction
from django.urls import reverse
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import requests
from celery import group as task_group
from django_countries.fields import CountryField
from imagekit.models import ImageSpecField
from PIL import Image
from pilkit.processors import ResizeToFit

from aindex.crunchbase import CrunchbaseAPI, parse_crunchbase_organization
from aindex.ctg import CtgAPI
from aindex.openai import extract_company_attrs
from aindex.sbir import SbirAPI
from aindex.uspto import UsptoAPI
from aindex.utils import get_country, us_state_code_name

from ..files.storage import company_image_path
from ..tasks import (pull_company_clinical_studies, pull_company_crunchbase_attrs, pull_company_grants,
                     pull_company_openai_attrs, pull_company_patent_applications, save_company_image_from_url)
from .base import (AcquisitionTerms, AcquisitionType, CompanyType, FundingStage, FundingType, Industry, InvestorType,
                   IPOStatus, OperatingStatus, TechnologyType)

__all__ = ['Company']

logger = logging.getLogger(__name__)


class Company(models.Model):

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255)
    summary = models.TextField(_('short description'), blank=True)
    description = models.TextField(_('full description'), blank=True)
    website = models.URLField(_('website'), blank=True, null=True, unique=True)
    duns = models.IntegerField(_('D-U-N-S number'), blank=True, null=True, unique=True)
    nid = models.IntegerField(_('Company NID'), blank=True, null=True, unique=True)

    cb_uuid = models.UUIDField(_('crunchbase UUID'), blank=True, null=True, unique=True)
    cb_url = models.URLField(_('crunchbase URL'), blank=True, null=True, unique=True)
    linkedin_url = models.URLField(_('linkedin URL'), blank=True)
    facebook_url = models.URLField(_('facebook URL'), blank=True)
    twitter_url = models.URLField(_('twitter URL'), blank=True)
    email = models.EmailField(_('email'), blank=True)
    phone_number = models.CharField(_('phone number'), max_length=64, blank=True)

    hq_country = CountryField(_('HQ country'), blank=True)
    hq_state_name = models.CharField(_('HQ state'), max_length=255, blank=True)
    hq_city_name = models.CharField(_('HQ city'), max_length=255, blank=True)
    hq_postal_code = models.CharField(_('HQ postal/zip code'), max_length=255, blank=True)
    hq_regions_names = ArrayField(
        models.CharField(max_length=64),
        default=list,
        blank=True,
        verbose_name=_('HQ regions')
    )
    address_line_1 = models.CharField(_('address line 1'), max_length=255, blank=True)
    address_line_2 = models.CharField(_('address line 2'), max_length=255, blank=True)

    image = models.ImageField(
        _('image'),
        upload_to=company_image_path,
        blank=True,
        null=True
    )

    image_md = ImageSpecField(
        source='image',
        processors=[ResizeToFit(512)],
        format='PNG',
        options={'quality': 90}
    )
    image_sm = ImageSpecField(
        source='image',
        processors=[ResizeToFit(256)],
        format='PNG',
        options={'quality': 90}
    )
    image_xxs = ImageSpecField(
        source='image',
        processors=[ResizeToFit(64)],
        format='PNG',
        options={'quality': 90}
    )

    founded_on = models.DateField(_('date founded'), blank=True, null=True)
    founded_on_precision = models.CharField(_('precision of date founded'), max_length=64, blank=True)
    year_founded = models.PositiveIntegerField(_('year founded'), blank=True, null=True, db_index=True)

    company_type = models.CharField(
        _('company type'),
        max_length=64,
        choices=CompanyType,
        blank=True
    )

    operating_status = models.CharField(
        _('operating status'),
        max_length=64,
        choices=OperatingStatus,
        blank=True
    )

    num_sub_organizations = models.PositiveIntegerField(
        _('number of sub-organizations'),
        blank=True,
        null=True
    )

    revenue_range = DecimalRangeField(
        _('estimated revenue range (USD)'),
        blank=True,
        null=True
    )

    exit_on = models.DateField(
        _('exit date'),
        blank=True,
        null=True,
        help_text=_('date the organization was acquired or went public')
    )
    exit_on_precision = models.CharField(_('precision of exit date'), max_length=64, blank=True)

    closed_on = models.DateField(
        _('closed date'),
        blank=True,
        null=True,
        help_text=_('date when the organization is closed')
    )
    closed_on_precision = models.CharField(_('precision of closing date'), max_length=64, blank=True)

    # industry categories
    technology_type = models.ForeignKey(
        TechnologyType,
        related_name='companies',
        related_query_name='company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('technology type')
    )

    industries = models.ManyToManyField(
        Industry,
        related_name='companies',
        related_query_name='company',
        verbose_name=_('industries'),
        blank=True
    )

    cb_industries_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('crunchbase industries')
    )

    cb_industries_groups = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('crunchbase industry groups')
    )

    # IPO and Stock
    ipo_status = models.ForeignKey(
        IPOStatus,
        related_name='companies',
        related_query_name='company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('IPO status')
    )

    ipo_money_raised = models.DecimalField(
        _('money raised at IPO (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    ipo_valuation = models.DecimalField(
        _('valuation at IPO (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    went_public_on = models.DateField(
        _('IPO date'),
        blank=True,
        null=True
    )

    delisted_on = models.DateField(
        _('delisted on'),
        blank=True,
        null=True,
        help_text=_('date the company was delisted from stock market')
    )
    delisted_on_precision = models.CharField(_('delisted date precision'), max_length=64, blank=True)

    stock_symbol = models.CharField(_('stock symbol'), max_length=64, blank=True)
    stock_exchange_symbol = models.CharField(_('stock exchange'), max_length=64, blank=True)
    stock_cb_url = models.URLField(_('stock crunchbase URL'), blank=True)

    # patents and trademarks
    patents_granted_count = models.PositiveIntegerField(_('number of patents granted'), null=True, blank=True)
    trademarks_count = models.PositiveIntegerField(
        _('number of trademarks registered'),
        null=True,
        blank=True
    )

    popular_patent_class = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('most popular patent class'),
        help_text=_('Most popular classes of patent across all the companies patents owned or applied for. '
                    'Detected by IPqwery.')
    )

    popular_trademark_class = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('most popular trademark class'),
    )

    # founders & team
    founders_count = models.PositiveIntegerField(_('number of founders'), blank=True, null=True)
    has_diversity_on_founders = models.BooleanField(_('has diversity on founding team'), null=True, blank=True)
    has_women_on_founders = models.BooleanField(_('women on founding team'), null=True, blank=True)
    has_black_on_founders = models.BooleanField(_('Black/African on founding team'), null=True, blank=True)
    has_hispanic_on_founders = models.BooleanField(_('Hispanic on founding team'), null=True, blank=True)
    has_asian_on_founders = models.BooleanField(_('Asian on founding team'), null=True, blank=True)
    has_meo_on_founders = models.BooleanField(_('Middle Eastern/Other on founding team'), null=True, blank=True)

    num_employees_range = IntegerRangeField(
        _('number of employees (range)'),
        blank=True,
        null=True
    )

    actively_hiring = models.BooleanField(
        _('actively hiring'),
        blank=True,
        null=True,
        help_text=_('Has at least one active job posting. Usually based on data from Jobbio')
    )

    last_layoff_date = models.DateField(_('last layoff date'), blank=True, null=True)
    last_key_employee_change = models.DateField(
        _('last leadership hiring date'),
        blank=True,
        null=True,
        help_text=_('Date company last hired executive (VP & above)')
    )

    # funding
    funding_rounds_count = models.PositiveIntegerField(_('number of funding rounds'), blank=True, null=True)

    funding_stage = models.ForeignKey(
        FundingStage,
        related_name='companies',
        related_query_name='company',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('funding stage')
    )

    last_funding_date = models.DateField(_('last funding date'), blank=True, null=True)

    last_funding_type = models.ForeignKey(
        FundingType,
        related_name='last_for_companies',
        related_query_name='last_for_campany',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('last funding round type')
    )

    last_funding_amount = models.DecimalField(
        _('last funding amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    total_funding_amount = models.DecimalField(
        _('total funding amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    last_equity_funding_type = models.ForeignKey(
        FundingType,
        related_name='last_equity_for_companies',
        related_query_name='last_equity_for_company',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('last equity funding type')
    )

    last_equity_funding_amount = models.DecimalField(
        _('last equity funding amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    total_equity_funding_amount = models.DecimalField(
        _('total equity funding amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    # investors
    investors_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('investors names'),
        help_text=_('usually includes only top investors'),
    )
    num_lead_investors = models.PositiveIntegerField(_('number of lead investors'), blank=True, null=True)
    num_investors = models.PositiveIntegerField(_('number of investors'), blank=True, null=True)

    # marger/acquisition
    was_acquired = models.BooleanField(_('was acquired'), blank=True, null=True)
    acquired_on = models.DateField(
        _('acquired on'),
        blank=True,
        null=True,
        help_text=_('date the acquisition was announced')
    )
    acquired_on_precision = models.CharField(
        _('acquired on precision'),
        blank=True,
        null=True,
        help_text=_('precision of date the acquisition was announced')
    )
    acquisition_name = models.CharField(
        _('acquisition name'),
        max_length=255,
        blank=True,
        help_text=_('auto-generated name of the transaction (e.g. Parakey acquired by Facebook)')
    )
    acquisition_cb_url = models.URLField(_('acquisition crunchbase URL'), blank=True)
    acquirer_name = models.CharField(_('acquirer name'), max_length=255, blank=True)
    acquirer_cb_url = models.URLField(_('acquirer crunchbase URL'), blank=True)
    acquisition_price = models.DecimalField(
        _('acquisition price (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )
    acquisition_type = models.CharField(
        _('acquisition type'),
        max_length=64,
        choices=AcquisitionType,
        blank=True
    )
    acquisition_terms = models.CharField(
        _('acquisition terms'),
        max_length=64,
        choices=AcquisitionTerms,
        blank=True
    )

    # acquisitions made
    made_acquisitions = models.BooleanField(_('made acquisitions'), blank=True, null=True)
    num_acquisitions = models.PositiveIntegerField(
        _('number of acquisitions'),
        blank=True,
        null=True,
        help_text=_('sum of all acquisitions related to the organization')
    )

    # post-money valuation
    valuation_range = DecimalRangeField(
        _('recent valuation range (USD)'),
        blank=True,
        null=True
    )
    valuation_date = models.DateField(_('most recent valuation date'), blank=True, null=True)

    # investments
    investor_types = models.ManyToManyField(
        InvestorType,
        blank=True,
        related_name='companies',
        related_query_name='company',
        verbose_name=_('investor type'),
        help_text=_('type of investor this organization is (e.g. Angel, Fund of Funds, Venture Capital)'),
    )
    investment_stages = models.ManyToManyField(
        FundingStage,
        blank=True,
        related_name='investors_companies',
        related_query_name='investor_company',
        verbose_name=_('investment stages'),
        help_text=_('the stages of investments made by this organization'),
    )

    accelerators_names = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('accelerators names')
    )

    # crunchbase ranking
    cb_rank = models.PositiveIntegerField(_('crunchbase company rank'), blank=True, null=True)
    cb_rank_delta_d7 = models.FloatField(_('crunchbase trend score (7 days)'), blank=True, null=True)
    cb_rank_delta_d30 = models.FloatField(_('crunchbase trend score (30 days)'), blank=True, null=True)
    cb_rank_delta_d90 = models.FloatField(_('crunchbase trend score (90 days)'), blank=True, null=True)

    cb_num_similar_companies = models.PositiveIntegerField(
        _('number of similar companies (crunchbase)'),
        blank=True,
        null=True
    )

    # crunchbase signals
    cb_hub_tags = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('crunchbase hub tags')
    )

    cb_growth_category = models.CharField(_('crunchbase growth category'), max_length=64, blank=True)
    cb_growth_confidence = models.CharField(_('crunchbase growth confidence'), max_length=64, blank=True)

    cb_num_articles = models.PositiveIntegerField(_('number of articles (crunchbase)'), blank=True, null=True)
    cb_num_events_appearances = models.PositiveIntegerField(
        _('number of events (crunchbase)'),
        blank=True,
        null=True
    )

    # web traffic (based on SEMrush)
    web_monthly_visits = models.PositiveBigIntegerField(
        _('web monthly visits'),
        blank=True,
        null=True
    )
    web_avg_visits_m6 = models.PositiveBigIntegerField(
        _('web average monthly visits (6 months)'),
        blank=True,
        null=True
    )
    web_monthly_visits_growth = models.FloatField(
        _('web monthly visits growth'),
        blank=True,
        null=True,
        help_text=_('Percent change in total visits to site from previous month. '
                    'Includes both desktop and mobile web.')
    )
    web_visit_duration = models.FloatField(
        _('web visit duration'),
        blank=True,
        null=True,
        help_text=_('Average time spent by users on a website, per visit in seconds. '
                    'Includes both desktop and mobile web.')
    )
    web_visit_duration_growth = models.FloatField(
        _('web visit duration growth'),
        blank=True,
        null=True,
        help_text=_('Average time spent by users on a website, per visit in seconds. '
                    'Includes both desktop and mobile web.')
    )
    web_pages_per_visit = models.FloatField(
        _('web page views per visit'),
        blank=True,
        null=True
    )
    web_pages_per_visit_growth = models.FloatField(
        _('web page views per visit growth'),
        blank=True,
        null=True
    )
    web_bounce_rate = models.FloatField(
        _('web bounce rate'),
        blank=True,
        null=True,
        help_text=_('Percentage of visitors to site who navigate away '
                    'after viewing only one page.')
    )
    web_bounce_rate_growth = models.FloatField(
        _('web bounce rate growth'),
        blank=True,
        null=True
    )
    web_traffic_rank = models.PositiveIntegerField(
        _('web global traffic rank'),
        blank=True,
        null=True,
        help_text=_('Traffic rank of site, as compared to all other sites on the web.')
    )
    web_monthly_traffic_rank_change = models.IntegerField(
        _('monthly web rank change'),
        blank=True,
        null=True,
        help_text=_('The raw number of rank positions that this site has changed from last month.')
    )
    web_monthly_traffic_rank_growth = models.FloatField(
        _('monthly web rank growth'),
        blank=True,
        null=True,
        help_text=_('Change in traffic rank of site in a given country from previous month.')
    )

    # Website technology stack
    web_tech_count = models.PositiveIntegerField(
        _('web active tech count'),
        blank=True,
        null=True,
        help_text=_('Number of technologies currently in used by company website. '
                    'Usually detected by BuiltWith.')
    )

    # Mobile apps metrics
    apps_count = models.PositiveIntegerField(
        _('number of apps'),
        blank=True,
        null=True,
        help_text=_('Total number of apps a given publisher has consolidated between itunes and Google Play. '
                    'Usually detected by Apptopia.')
    )

    apps_downloads_count_d30 = models.PositiveIntegerField(
        _('apps downloads last 30 days'),
        blank=True,
        null=True,
        help_text=_('Total downloads for the previous month for all apps published by this company.')
    )

    # Company technology stack
    tech_stack_product_count = models.PositiveIntegerField(
        _('tech stack product count'),
        blank=True,
        null=True,
        help_text=_('Total number of products currently in use by this company. '
                    'Usually detected by G2 Stack.')
    )

    # IT Spending
    it_spending_amount = models.DecimalField(
        _('IT spending per year (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Usually be detected by Aberdeen.')
    )

    extras = models.JSONField(_('extras'), default=dict, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_company',
        related_query_name='created_companies',
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
        verbose_name = _('Company')
        verbose_name_plural = _('Companies')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new = not bool(self.id)

        super().save(*args, **kwargs)

        # Process a newly created company
        if is_new:
            transaction.on_commit(lambda: self.pull_attrs())

    def get_absolute_url(self):
        return reverse('companies:company-detail', kwargs={'uuid': self.uuid})

    @property
    def sbir_url(self):
        if self.nid:
            return f'https://www.sbir.gov/portfolio/{self.nid}'

    @property
    def cb_permalink(self):
        """Unique identifier on crunchbase."""
        if self.cb_url:
            match = re.match(
                r'https?://(?:www.)?crunchbase.com/organization/(?P<permalink>[-\w]+)',
                self.cb_url
            )
            if match:
                return match.groupdict().get('permalink')

    @property
    def hq_location(self):
        hq_location = [self.hq_city_name, self.hq_state_name]
        if self.hq_country:
            hq_location.append(self.hq_country)
        hq_location = ', '.join([str(loc) for loc in hq_location if loc])
        return hq_location

    def save_image_from_url(self, url):
        """Download and save company image from the provided URL."""

        r = requests.get(url, stream=True)

        with NamedTemporaryFile('wb+', delete=True) as f:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
            f.seek(0)

            # Try to verify image.
            # Loosely based on default django 5.0 implementation
            try:
                image = Image.open(f)
                image.verify()
                default_extension = mimetypes.guess_extension(Image.MIME.get(image.format))
                f.seek(0)
            except IOError:
                raise ValidationError(
                    _('Failed to validate image from %(url)s') % {'url': url},
                    code='invalid_image',
                )

            file_name = '%s%s' % (
                hashlib.md5(url.encode('utf-8')).hexdigest(),
                Path(urlparse(url).path).suffix or default_extension
            )

            image_file = File(f)
            self.image.save(file_name, image_file, save=False)
            self.__class__.objects.filter(pk=self.pk).update(image=self.image, updated_at=now())

            return self.image.url

    def pull_crunchbase_attrs(self, overwrite=False):
        """Pull and save additional company attributes from Crunchbase."""

        if not self.cb_permalink:
            return

        crunchbase = CrunchbaseAPI()
        attrs = crunchbase.get_organization(self.cb_permalink)
        attrs = parse_crunchbase_organization(attrs)

        if not self.name or overwrite:
            self.name = attrs.get('name') or ''

        if not self.summary or overwrite:
            self.summary = attrs.get('short_description') or ''

        if not self.linkedin_url or overwrite:
            self.linkedin_url = attrs.get('linkedin_url') or ''

        if not self.website or overwrite:
            self.website = attrs.get('website_url') or ''

        if not self.cb_uuid or overwrite:
            self.cb_uuid = attrs.get('uuid')

        # location
        location = attrs.get('location', {})

        if not self.hq_country or overwrite:
            hq_country = location.get('country')
            hq_country = get_country(hq_country)
            hq_country = hq_country.alpha_2 if hq_country else ''
            self.hq_country = hq_country

        if not self.hq_state_name or overwrite:
            self.hq_state_name = location.get('region') or ''

        if not self.hq_city_name or overwrite:
            self.hq_city_name = location.get('city') or ''

        # diversity
        if self.has_women_on_founders is None or overwrite:
            self.has_women_on_founders = attrs.get('has_women_on_founders')
        if self.has_black_on_founders is None or overwrite:
            self.has_black_on_founders = attrs.get('has_black_on_founders')
        if self.has_asian_on_founders is None or overwrite:
            self.has_asian_on_founders = attrs.get('has_asian_on_founders')
        if self.has_hispanic_on_founders is None or overwrite:
            self.has_hispanic_on_founders = attrs.get('has_hispanic_on_founders')
        if self.has_meo_on_founders is None or overwrite:
            self.has_meo_on_founders = attrs.get('has_meo_on_founders')
        if self.has_diversity_on_founders is None or overwrite:
            self.has_diversity_on_founders = attrs.get('has_diversity_on_founders')

        # extras
        extras = self.extras
        if isinstance(extras, str):
            extras = json.loads(extras)
        cb_extras = extras.get('crunchbase', {})
        extras['crunchbase'] = {**cb_extras, **attrs}
        self.extras = json.dumps(extras, cls=DjangoJSONEncoder)

        # save changes
        # try to avoid race condition
        update_fields = ['name', 'summary', 'cb_uuid', 'linkedin_url', 'website', 'hq_country',
                         'hq_state_name', 'hq_city_name', 'has_women_on_founders', 'has_black_on_founders',
                         'has_asian_on_founders', 'has_hispanic_on_founders', 'has_meo_on_founders',
                         'has_diversity_on_founders', 'extras', 'updated_at']
        self.save(update_fields=update_fields)

        # save image
        image_url = attrs.get('image_url')
        if image_url and (not self.image or overwrite):
            transaction.on_commit(lambda: save_company_image_from_url.delay(pk=self.pk, url=image_url))

        return attrs

    def pull_openai_attrs(self, overwrite=False):
        """Extract and save additional company attributes from openai."""

        industry_choices = Industry.objects.values('name')
        technology_type_choices = TechnologyType.objects.values('name')

        extra_attrs = extract_company_attrs(
            company={
                'name': self.name,
                'summary': self.summary,
                'description': self.description,
                'cb_industry_names': self.cb_industries_names
            },
            industries=list(industry_choices),
            technology_types=list(technology_type_choices)
        )

        if not extra_attrs:
            return

        # industries
        industries_names = extra_attrs.get('industries', [])
        industries = Industry.objects.filter(name__in=industries_names)
        if overwrite:
            self.industries.clear()
        self.industries.add(*industries)

        # technology type
        if not self.technology_type or overwrite:
            technology_type_name = extra_attrs.get('technology_type')
            try:
                technology_type = TechnologyType.objects.get(name__iexact=technology_type_name)
                self.technology_type = technology_type
            except TechnologyType.DoesNotExist:
                pass

        # save changes
        self.save(update_fields=['technology_type', 'updated_at'])

        return extra_attrs

    def pull_patent_applications(self):

        q_filters = {'company_name': self.name}

        if self.hq_city_name:
            q_filters['city'] = self.hq_city_name
        elif self.hq_state_name:
            q_filters['state'] = self.hq_state_name

        self.patent_applications.all().delete()
        uspto = UsptoAPI()
        r = uspto.search_patents(**q_filters)
        if not r.ok:
            try:
                return r.json()
            except requests.JSONDecodeError:
                return

        results = r.json()

        if not results.get('count'):
            return results

        for result in results['patentFileWrapperDataBag']:

            pam = result['applicationMetaData']

            patent_attrs = {
                'number': result['applicationNumberText'],
                'patent_number': pam.get('patentNumber', ''),
                'confirmation_number': pam.get('applicationConfirmationNumber'),
                'invention_title': pam.get('inventionTitle', ''),
                'first_inventor_name': pam.get('firstInventorName', ''),
                'first_applicant_name': pam.get('firstApplicantName', ''),
                'status_code': pam.get('applicationStatusCode', ''),
                'status_description': pam.get('applicationStatusDescriptionText', ''),
                'status_date': pam.get('applicationStatusDate'),
                'type_code': pam.get('applicationTypeCode', ''),
                'type_label': pam.get('applicationTypeLabelName', ''),
                'type_category': pam.get('applicationTypeCategory', ''),
                'filing_date': pam.get('filingDate'),
                'grant_date': pam.get('grantDate'),
                'earliest_publication_date': pam.get('earliestPublicationDate'),
                'earliest_publication_number': pam.get('earliestPublicationNumber', ''),
                'pct_publication_date': pam.get('pctPublicationDate', ''),
                'pct_publication_number': pam.get('pctPublicationNumber', ''),
                'publication_categories': pam.get('publicationCategoryBag', []),
                'publication_dates': pam.get('publicationDateBag', []),
                'publication_sequence_numbers': pam.get('publicationSequenceNumberBag', []),
                'extras': result,
            }

            update_attrs = {
                field_name: field_value for field_name, field_value in patent_attrs.items()
                if field_value not in [None, '', {}, []]
            }

            self.patent_applications.update_or_create(
                number=patent_attrs['number'],
                defaults=update_attrs,
                create_defaults=patent_attrs,
            )

        return results

    def pull_grants(self, save=True, update_company=True, raise_for_status=True):
        """Pull company data from sbir.gov API.

        SBIR provides data related to grants awarded to the company.

        Args:
            save (bool):
                Save grant awards data in the database.

            update_company (bool):
                Overwrite company data based on the matched firm data.

            raise_for_status (bool):
                Raise exceptions when HTTP related errors are encountered

        Returns:
            dict or None:
                A dictionary of firm data and list of awards. Returns None if
                no firm was matched.
        """
        sbir = SbirAPI(raise_for_status=raise_for_status)
        try:
            firms = sbir.search_firms(name=self.name)
        except requests.HTTPError:
            logger.exception('Failed to search for firms from SBIR')
            return

        if firms:
            firm = firms[0]
        else:
            return

        awards = sbir.search_awards(firm=firm['company_name'])

        if save:

            # clear old grants data
            self.grants.all().delete()

            for award in awards:
                self.grants.create(
                    name=award['award_title'],
                    granting_agency=sbir.AGENCY_LOOKUP.get(award['agency'], award['agency']) or '',
                    description=award['abstract'] or '',
                    potential_amount=award['award_amount'],
                    award_year=award['award_year'],
                    program_name=award['program'] or '',
                    branch=award['branch'] or '',
                    phase=award['phase'] or '',
                    sbir_id=award['award_link'] or '',
                    extras={'sbir_data': award}
                )

            if update_company:

                company_data = {
                    'name': firm['company_name'],
                    'duns': firm['duns'],
                    'nid': firm['firm_nid'],
                    'website': firm['company_url'],
                    'address_line_1': firm['address1'],
                    'address_line_2': firm['address2'],
                    'hq_city_name': firm['city'],
                    'hq_state_name': us_state_code_name.get(firm['state'], ''),
                    'hq_postal_code': firm['zip'],
                }

                update_fields = ['updated_at']
                for field_name, field_value in company_data.items():
                    if field_value:
                        update_fields.append(field_name)
                        setattr(self, field_name, field_value)
                self.save(update_fields=update_fields)

        return {
            **firm,
            'awards': awards
        }

    def pull_clinical_studies(self):
        ctg = CtgAPI()

        if not self.name:
            return

        self.clinical_studies.all().delete()

        params = {
            'query.spons': f'"{self.name}"',
        }

        fields = [
            'protocolSection.identificationModule.nctId',
            'protocolSection.identificationModule.briefTitle',
            'protocolSection.descriptionModule.briefSummary',
            'protocolSection.sponsorCollaboratorsModule.leadSponsor.name',
            'protocolSection.sponsorCollaboratorsModule.collaborators.name',
            'protocolSection.statusModule.overallStatus',
            'protocolSection.statusModule.startDateStruct.date',
            'protocolSection.statusModule.completionDateStruct.date'
        ]
        data = ctg.get_studies(params=params, fields=fields, page_size=1000, count_total=True)

        for study in data['studies']:

            protocol_section = study.get('protocolSection', {})

            id_module = protocol_section.get('identificationModule', {})
            nct_id = id_module.get('nctId', '')
            title = id_module.get('briefTitle', '')

            description = protocol_section.get('descriptionModule', {}).get('briefSummary', '')

            sponsors_collaborators = protocol_section.get('sponsorCollaboratorsModule', {})
            lead_sponsor_name = sponsors_collaborators.get('leadSponsor', {}).get('name', '')
            collaborators_names = [
                collaborator.get('name', '')
                for collaborator in sponsors_collaborators.get('collaborators', [])
            ]

            status_module = protocol_section['statusModule']
            start_date_struct = status_module.get('startDateStruct') or {}
            start_date_str = start_date_struct.get('date', '')
            completion_date_struct = status_module.get('completionDateStruct') or {}
            completion_date_str = completion_date_struct.get('date', '')
            overall_status = status_module.get('overallStatus', '')

            self.clinical_studies.create(
                nct_id=nct_id,
                title=title,
                description=description,
                lead_sponsor_name=lead_sponsor_name,
                collaborators_names=collaborators_names,
                status=overall_status,
                start_date_str=start_date_str,
                completion_date_str=completion_date_str,
            )

        return data

    def pull_attrs(self):
        base_attrs_task = task_group(
            pull_company_crunchbase_attrs.si(pk=self.pk),
            pull_company_openai_attrs.si(pk=self.pk),
            pull_company_grants.si(pk=self.pk),
            pull_company_patent_applications.si(pk=self.pk),
            pull_company_clinical_studies.si(pk=self.pk)
        ).delay()

        return base_attrs_task
