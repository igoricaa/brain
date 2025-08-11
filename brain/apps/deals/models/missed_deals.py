import json
import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField, DecimalRangeField, IntegerRangeField
from django.db import models, transaction
from django.db.models import Q
from django.db.models.utils import resolve_callables
from django.utils.dateparse import parse_date
from django.utils.translation import gettext_lazy as _

from django_countries.fields import CountryField

from companies.models import AcquisitionTerms, AcquisitionType, Company, CompanyType, OperatingStatus

__all__ = ["MissedDeal"]


class MissedDeal(models.Model):

    company = models.ForeignKey(
        'companies.Company',
        related_name='missed_deals',
        related_query_name='missed_deal',
        on_delete=models.PROTECT,
        blank=True,
        verbose_name=_('company'),
    )

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255)
    summary = models.TextField(_('short description'), blank=True)
    description = models.TextField(_('full description'), blank=True)
    website = models.URLField(_('website'), blank=True)

    cb_url = models.URLField(_('crunchbase URL'), blank=True)
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
        models.CharField(max_length=64), default=list, blank=True, verbose_name=_('HQ regions')
    )

    company_type = models.CharField(_('company type'), max_length=64, choices=CompanyType, blank=True)

    operating_status = models.CharField(_('operating status'), max_length=64, choices=OperatingStatus, blank=True)

    num_sub_organizations = models.PositiveIntegerField(_('number of sub-organizations'), blank=True, null=True)

    revenue_range = DecimalRangeField(_('estimated revenue range (USD)'), blank=True, null=True)

    cb_industries_names = ArrayField(
        models.CharField(max_length=255), default=list, blank=True, verbose_name=_('crunchbase industries')
    )

    cb_industries_groups = ArrayField(
        models.CharField(max_length=255), default=list, blank=True, verbose_name=_('crunchbase industry groups')
    )

    # IPO and Stock
    ipo_status = models.ForeignKey(
        'companies.IPOStatus',
        related_name='missed_deals',
        related_query_name='missed_deal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('IPO status'),
    )

    ipo_money_raised = models.DecimalField(
        _('money raised at IPO (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )

    ipo_valuation = models.DecimalField(
        _('valuation at IPO (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )

    went_public_on = models.DateField(_('IPO date'), blank=True, null=True)

    delisted_on = models.DateField(
        _('delisted on'), blank=True, null=True, help_text=_('date the company was delisted from stock market')
    )
    delisted_on_precision = models.CharField(_('delisted date precision'), max_length=64, blank=True)

    stock_symbol = models.CharField(_('stock symbol'), max_length=64, blank=True)
    stock_exchange_symbol = models.CharField(_('stock exchange'), max_length=64, blank=True)
    stock_cb_url = models.URLField(_('stock crunchbase URL'), blank=True)

    # patents and trademarks
    patents_granted_count = models.PositiveIntegerField(_('number of patents granted'), null=True, blank=True)
    trademarks_count = models.PositiveIntegerField(_('number of trademarks registered'), null=True, blank=True)

    popular_patent_class = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('most popular patent class'),
        help_text=_(
            'Most popular classes of patent across all the companies patents owned or applied for. '
            'Detected by IPqwery.'
        ),
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

    num_employees_range = IntegerRangeField(_('number of employees (range)'), blank=True, null=True)

    actively_hiring = models.BooleanField(
        _('actively hiring'),
        blank=True,
        null=True,
        help_text=_('Has at least one active job posting. Usually based on data from Jobbio'),
    )

    last_layoff_date = models.DateField(_('last layoff date'), blank=True, null=True)
    last_key_employee_change = models.DateField(
        _('last leadership hiring date'),
        blank=True,
        null=True,
        help_text=_('Date company last hired executive (VP & above)'),
    )

    # funding
    funding_rounds_count = models.PositiveIntegerField(_('number of funding rounds'), blank=True, null=True)

    funding_stage = models.ForeignKey(
        'companies.FundingStage',
        related_name='missed_deals',
        related_query_name='missed_deal',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('funding stage'),
    )

    last_funding_date = models.DateField(_('last funding date'), blank=True, null=True)
    last_funding_year = models.PositiveIntegerField(_('last funding year'), blank=True, null=True)
    last_funding_month = models.PositiveIntegerField(_('last funding month'), blank=True, null=True)

    last_funding_type = models.ForeignKey(
        'companies.FundingType',
        related_name='missed_deals_last',
        related_query_name='missed_deal_last',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('last funding round type'),
    )

    last_funding_amount = models.DecimalField(
        _('last funding amount (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )

    total_funding_amount = models.DecimalField(
        _('total funding amount (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )

    last_equity_funding_type = models.ForeignKey(
        'companies.FundingType',
        related_name='missed_deals_equity_last',
        related_query_name='missed_deals_equity_last',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('last equity funding type'),
    )

    last_equity_funding_amount = models.DecimalField(
        _('last equity funding amount (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )

    total_equity_funding_amount = models.DecimalField(
        _('total equity funding amount (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
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
        _('acquired on'), blank=True, null=True, help_text=_('date the acquisition was announced')
    )
    acquired_on_precision = models.CharField(
        _('acquired on precision'),
        blank=True,
        null=True,
        help_text=_('precision of date the acquisition was announced'),
    )
    acquisition_name = models.CharField(
        _('acquisition name'),
        max_length=255,
        blank=True,
        help_text=_('auto-generated name of the transaction (e.g. Parakey acquired by Facebook)'),
    )
    acquisition_cb_url = models.URLField(_('acquisition crunchbase URL'), blank=True)
    acquirer_name = models.CharField(_('acquirer name'), max_length=255, blank=True)
    acquirer_cb_url = models.URLField(_('acquirer crunchbase URL'), blank=True)
    acquisition_price = models.DecimalField(
        _('acquisition price (USD)'), max_digits=15, decimal_places=2, blank=True, null=True
    )
    acquisition_type = models.CharField(_('acquisition type'), max_length=64, choices=AcquisitionType, blank=True)
    acquisition_terms = models.CharField(_('acquisition terms'), max_length=64, choices=AcquisitionTerms, blank=True)

    # acquisitions made
    made_acquisitions = models.BooleanField(_('made acquisitions'), blank=True, null=True)
    num_acquisitions = models.PositiveIntegerField(
        _('number of acquisitions'),
        blank=True,
        null=True,
        help_text=_('sum of all acquisitions related to the organization'),
    )

    # post-money valuation
    valuation_range = DecimalRangeField(_('recent valuation range (USD)'), blank=True, null=True)
    valuation_date = models.DateField(_('most recent valuation date'), blank=True, null=True)

    # investments
    investor_types = models.ManyToManyField(
        'companies.InvestorType',
        blank=True,
        related_name='missed_deals',
        related_query_name='missed_deal',
        verbose_name=_('investor type'),
        help_text=_('type of investor this organization is (e.g. Angel, Fund of Funds, Venture Capital)'),
    )
    investment_stages = models.ManyToManyField(
        'companies.FundingStage',
        blank=True,
        related_name='investors_missed_deals',
        related_query_name='investor_missed_deal',
        verbose_name=_('investment stages'),
        help_text=_('the stages of investments made by this organization'),
    )

    accelerators_names = ArrayField(
        models.CharField(max_length=255), default=list, blank=True, verbose_name=_('accelerators names')
    )

    # crunchbase ranking
    cb_rank = models.PositiveIntegerField(_('crunchbase company rank'), blank=True, null=True)
    cb_rank_delta_d7 = models.FloatField(_('crunchbase trend score (7 days)'), blank=True, null=True)
    cb_rank_delta_d30 = models.FloatField(_('crunchbase trend score (30 days)'), blank=True, null=True)
    cb_rank_delta_d90 = models.FloatField(_('crunchbase trend score (90 days)'), blank=True, null=True)

    cb_num_similar_companies = models.PositiveIntegerField(
        _('number of similar companies (crunchbase)'), blank=True, null=True
    )

    # crunchbase signals
    cb_hub_tags = ArrayField(
        models.CharField(max_length=255), default=list, blank=True, verbose_name=_('crunchbase hub tags')
    )

    cb_growth_category = models.CharField(_('crunchbase growth category'), max_length=64, blank=True)
    cb_growth_confidence = models.CharField(_('crunchbase growth confidence'), max_length=64, blank=True)

    cb_num_articles = models.PositiveIntegerField(_('number of articles (crunchbase)'), blank=True, null=True)
    cb_num_events_appearances = models.PositiveIntegerField(_('number of events (crunchbase)'), blank=True, null=True)

    # web traffic (based on SEMrush)
    web_monthly_visits = models.PositiveBigIntegerField(_('web monthly visits'), blank=True, null=True)
    web_avg_visits_m6 = models.PositiveBigIntegerField(
        _('web average monthly visits (6 months)'), blank=True, null=True
    )
    web_monthly_visits_growth = models.FloatField(
        _('web monthly visits growth'),
        blank=True,
        null=True,
        help_text=_(
            'Percent change in total visits to site from previous month. ' 'Includes both desktop and mobile web.'
        ),
    )
    web_visit_duration = models.FloatField(
        _('web visit duration'),
        blank=True,
        null=True,
        help_text=_(
            'Average time spent by users on a website, per visit in seconds. ' 'Includes both desktop and mobile web.'
        ),
    )
    web_visit_duration_growth = models.FloatField(
        _('web visit duration growth'),
        blank=True,
        null=True,
        help_text=_(
            'Average time spent by users on a website, per visit in seconds. ' 'Includes both desktop and mobile web.'
        ),
    )
    web_pages_per_visit = models.FloatField(_('web page views per visit'), blank=True, null=True)
    web_pages_per_visit_growth = models.FloatField(_('web page views per visit growth'), blank=True, null=True)
    web_bounce_rate = models.FloatField(
        _('web bounce rate'),
        blank=True,
        null=True,
        help_text=_('Percentage of visitors to site who navigate away ' 'after viewing only one page.'),
    )
    web_bounce_rate_growth = models.FloatField(_('web bounce rate growth'), blank=True, null=True)
    web_traffic_rank = models.PositiveIntegerField(
        _('web global traffic rank'),
        blank=True,
        null=True,
        help_text=_('Traffic rank of site, as compared to all other sites on the web.'),
    )
    web_monthly_traffic_rank_change = models.IntegerField(
        _('monthly web rank change'),
        blank=True,
        null=True,
        help_text=_('The raw number of rank positions that this site has changed from last month.'),
    )
    web_monthly_traffic_rank_growth = models.FloatField(
        _('monthly web rank growth'),
        blank=True,
        null=True,
        help_text=_('Change in traffic rank of site in a given country from previous month.'),
    )

    # Website technology stack
    web_tech_count = models.PositiveIntegerField(
        _('web active tech count'),
        blank=True,
        null=True,
        help_text=_('Number of technologies currently in used by company website. ' 'Usually detected by BuiltWith.'),
    )

    # Mobile apps metrics
    apps_count = models.PositiveIntegerField(
        _('number of apps'),
        blank=True,
        null=True,
        help_text=_(
            'Total number of apps a given publisher has consolidated between itunes and Google Play. '
            'Usually detected by Apptopia.'
        ),
    )

    apps_downloads_count_d30 = models.PositiveIntegerField(
        _('apps downloads last 30 days'),
        blank=True,
        null=True,
        help_text=_('Total downloads for the previous month for all apps published by this company.'),
    )

    # Company technology stack
    tech_stack_product_count = models.PositiveIntegerField(
        _('tech stack product count'),
        blank=True,
        null=True,
        help_text=_('Total number of products currently in use by this company. ' 'Usually detected by G2 Stack.'),
    )

    # IT Spending
    it_spending_amount = models.DecimalField(
        _('IT spending per year (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Usually be detected by Aberdeen.'),
    )

    #: True if the missed deal was among deals in the database when it was recorded.
    was_in_deals = models.BooleanField(_('was in deals'), default=False)

    extras = models.JSONField(_('extras'), default=dict, blank=True)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_missed_deals',
        related_query_name='created_missed_deal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator'),
    )
    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Missed Deal')
        verbose_name_plural = _('Missed Deals')
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'last_funding_year', 'last_funding_month'],
                name='%(app_label)s_%(class)s_company_last_funding_year_month_key',
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):

        is_new = not bool(self.id)

        if self.last_funding_date:
            self.last_funding_year = self.last_funding_date.year
            self.last_funding_month = self.last_funding_date.month

        if not self.company:
            self.set_company()

        if is_new and self.company:
            self.was_in_deals = self.company.deals.exists()

        super().save(*args, **kwargs)

    @property
    def image(self):
        if self.company:
            return self.company.image

    @property
    def image_md(self):
        if self.company:
            return self.company.image_md

    @property
    def image_sm(self):
        if self.company:
            return self.company.image_sm

    @property
    def image_xxs(self):
        if self.company:
            return self.company.image_xxs

    @property
    def hq_location(self):
        hq_location = [self.hq_city_name, self.hq_state_name]
        if self.hq_country:
            hq_location.append(self.hq_country)
        hq_location = ', '.join([str(loc) for loc in hq_location if loc])
        return hq_location

    def set_company(self, **kwargs):
        """Prepare the company object and link it with the report.

        Creates the new company if it does not exist yet.

        Args:
            kwargs:
                values used for company lookup. If not provided the company wil be looked up using either
                crunchbase url or website.
        """

        extras = self.extras
        if isinstance(extras, str):
            extras = json.loads(extras)

        founded_on = extras.get('founded_on')
        if isinstance(founded_on, str):
            founded_on = parse_date(founded_on)

        if founded_on:
            founded_year = founded_on.year
        else:
            founded_year = None

        attrs = {
            'name': self.name,
            'summary': self.summary,
            'description': self.description,
            'website': self.website or None,
            'cb_url': self.cb_url or None,
            'linkedin_url': self.linkedin_url,
            'facebook_url': self.facebook_url,
            'twitter_url': self.twitter_url,
            'email': self.email,
            'phone_number': self.phone_number,
            'hq_country': self.hq_country,
            'hq_state_name': self.hq_state_name,
            'hq_city_name': self.hq_city_name,
            'hq_postal_code': self.hq_postal_code,
            'hq_regions_names': self.hq_regions_names,
            'company_type': self.company_type,
            'operating_status': self.operating_status,
            'num_sub_organizations': self.num_sub_organizations,
            'revenue_range': self.revenue_range,
            'cb_industries_names': self.cb_industries_names,
            'cb_industries_groups': self.cb_industries_groups,
            'ipo_status': self.ipo_status,
            'ipo_money_raised': self.ipo_money_raised,
            'ipo_valuation': self.ipo_valuation,
            'went_public_on': self.went_public_on,
            'delisted_on': self.delisted_on,
            'delisted_on_precision': self.delisted_on_precision,
            'stock_symbol': self.stock_symbol,
            'stock_exchange_symbol': self.stock_exchange_symbol,
            'stock_cb_url': self.stock_cb_url,
            'patents_granted_count': self.patents_granted_count,
            'trademarks_count': self.trademarks_count,
            'popular_patent_class': self.popular_patent_class,
            'popular_trademark_class': self.popular_trademark_class,
            'founders_count': self.founders_count,
            'has_diversity_on_founders': self.has_diversity_on_founders,
            'has_women_on_founders': self.has_women_on_founders,
            'has_black_on_founders': self.has_black_on_founders,
            'has_hispanic_on_founders': self.has_hispanic_on_founders,
            'has_asian_on_founders': self.has_asian_on_founders,
            'has_meo_on_founders': self.has_meo_on_founders,
            'num_employees_range': self.num_employees_range,
            'actively_hiring': self.actively_hiring,
            'last_layoff_date': self.last_layoff_date,
            'last_key_employee_change': self.last_key_employee_change,
            'funding_rounds_count': self.funding_rounds_count,
            'funding_stage': self.funding_stage,
            'last_funding_date': self.last_funding_date,
            'last_funding_type': self.last_funding_type,
            'last_funding_amount': self.last_funding_amount,
            'total_funding_amount': self.total_funding_amount,
            'last_equity_funding_type': self.last_equity_funding_type,
            'last_equity_funding_amount': self.last_equity_funding_amount,
            'total_equity_funding_amount': self.total_equity_funding_amount,
            'investors_names': self.investors_names,
            'num_lead_investors': self.num_lead_investors,
            'num_investors': self.num_investors,
            'was_acquired': self.was_acquired,
            'acquired_on': self.acquired_on,
            'acquired_on_precision': self.acquired_on_precision,
            'acquisition_name': self.acquisition_name,
            'acquisition_cb_url': self.acquisition_cb_url,
            'acquirer_name': self.acquirer_name,
            'acquirer_cb_url': self.acquirer_cb_url,
            'acquisition_price': self.acquisition_price,
            'acquisition_type': self.acquisition_type,
            'acquisition_terms': self.acquisition_terms,
            'made_acquisitions': self.made_acquisitions,
            'num_acquisitions': self.num_acquisitions,
            'valuation_range': self.valuation_range,
            'valuation_date': self.valuation_date,
            'accelerators_names': self.accelerators_names,
            'cb_rank': self.cb_rank,
            'cb_rank_delta_d7': self.cb_rank_delta_d7,
            'cb_rank_delta_d30': self.cb_rank_delta_d30,
            'cb_rank_delta_d90': self.cb_rank_delta_d90,
            'cb_num_similar_companies': self.cb_num_similar_companies,
            'cb_hub_tags': self.cb_hub_tags,
            'cb_growth_category': self.cb_growth_category,
            'cb_growth_confidence': self.cb_growth_confidence,
            'cb_num_articles': self.cb_num_articles,
            'cb_num_events_appearances': self.cb_num_events_appearances,
            'web_monthly_visits': self.web_monthly_visits,
            'web_avg_visits_m6': self.web_avg_visits_m6,
            'web_monthly_visits_growth': self.web_monthly_visits_growth,
            'web_visit_duration': self.web_visit_duration,
            'web_visit_duration_growth': self.web_visit_duration_growth,
            'web_pages_per_visit': self.web_pages_per_visit,
            'web_pages_per_visit_growth': self.web_pages_per_visit_growth,
            'web_bounce_rate': self.web_bounce_rate,
            'web_bounce_rate_growth': self.web_bounce_rate_growth,
            'web_traffic_rank': self.web_traffic_rank,
            'web_monthly_traffic_rank_change': self.web_monthly_traffic_rank_change,
            'web_monthly_traffic_rank_growth': self.web_monthly_traffic_rank_growth,
            'web_tech_count': self.web_tech_count,
            'apps_count': self.apps_count,
            'apps_downloads_count_d30': self.apps_downloads_count_d30,
            'tech_stack_product_count': self.tech_stack_product_count,
            'it_spending_amount': self.it_spending_amount,
            'creator': self.creator,
            'closed_on': extras.get('closed_on') or None,
            'closed_on_precision': extras.get('closed_on_precision', ''),
            'exit_on': extras.get('exit_on') or None,
            'exit_on_precision': extras.get('exit_on_precision', ''),
            'founded_on': founded_on,
            'founded_on_precision': extras.get('founded_on_precision', ''),
            'year_founded': founded_year,
        }

        update_attrs = {
            field_name: field_value
            for field_name, field_value in attrs.items()
            if field_value not in [None, '', {}, []]
        }

        or_kwargs = {}
        if self.cb_url:
            or_kwargs['cb_url'] = self.cb_url
        if self.website:
            or_kwargs['website'] = self.website

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

        transaction.on_commit(self._update_company_m2m)

        self.company = company

    def _update_company_m2m(self):

        investor_types = self.investor_types.all()
        if investor_types:
            self.company.investor_types.add(*investor_types)

        investment_stages = self.investment_stages.all()
        if investor_types:
            self.company.investment_stages.add(*investment_stages)
