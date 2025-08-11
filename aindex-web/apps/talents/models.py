import datetime
import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

from django_countries.fields import CountryField
from pytimeparse2 import parse as parse_duration

from aindex.coresignal import CoresignalAPI
from aindex.openai import extract_founder_attrs
from aindex.utils import get_country, standardize_partial_date_str


class Founder(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    company = models.ForeignKey(
        'companies.Company',
        related_name='founders',
        related_query_name='founder',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('company')
    )
    name = models.CharField(_('name'), max_length=255, blank=True)
    title = models.CharField(_('title'), max_length=255, blank=True)
    description = models.TextField(_('description'), blank=True)
    linkedin_url = models.URLField(_('Linkedin URL'), blank=True, null=True)
    country = CountryField(_('country'), blank=True)
    location = models.CharField(_('location'), max_length=255, blank=True)

    bachelor_grad_year = models.PositiveIntegerField(
        _("bachelor's graduation year"),
        null=True,
        blank=True
    )

    age_at_founding = models.PositiveIntegerField(
        _('age at founding'),
        null=True,
        blank=True,
        help_text=_('Can be estimated based on assumption the founder graduated with 22 years old.')
    )

    bachelor_degree_type = models.CharField(
        _("bachelor's degree type"),
        max_length=128,
        blank=True
    )

    bachelor_school = models.CharField(
        _("bachelor's school"),
        max_length=255,
        blank=True
    )

    graduate_degree_type = models.CharField(
        _('graduate degree type'),
        max_length=128,
        blank=True
    )

    graduate_school = models.CharField(
        _('graduate school'),
        max_length=255,
        blank=True
    )

    phd_school = models.CharField(
        _('PHD school'),
        max_length=255,
        blank=True,
    )

    has_military_or_govt_background = models.BooleanField(
        _('has government or military background'),
        null=True,
        blank=True
    )

    military_or_govt_background = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('government or military background'),
        help_text=_('example: government agency, army, air force, navy')
    )

    prior_founding_count = models.PositiveIntegerField(
        _('number of prior founding attempts'),
        null=True,
        blank=True
    )

    past_significant_employment = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('last significant employment')
    )

    extras = models.JSONField(_('extras'), default=dict, blank=True)

    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True,
        db_default=Now()
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Founder')
        verbose_name_plural = _('Founders')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # estimate age based on bachelor grad year,
        # assuming 22 years old on grad year
        if not self.age_at_founding and self.bachelor_grad_year and self.company and self.company.year_founded:
            self.age_at_founding = self.company.year_founded - self.bachelor_grad_year + 22
        return super().save(*args, **kwargs)

    def pull_coresignal_data(self, raise_for_status=False):
        """Pull data from Coresignal."""
        coresignal = CoresignalAPI(raise_for_status=raise_for_status)

        data = None

        filters = {'name': self.name}
        if self.company:
            if self.company.website:
                filters['experience_company_website_url'] = self.company.website
                data = coresignal.search_member(**filters)

            if not data:
                filters['experience_company_name'] = self.company.name
                data = coresignal.search_member(**filters)

        if not self.company or not data:
            filters['location'] = settings.CORESIGNAL_DEFAULT_SEARCH_LOCATION
            data = coresignal.search_member(**filters)

        if not data:
            return

        self.description = data['summary'] or ''
        self.linkedin_url = data['canonical_url']

        country = get_country(data['country'])
        if country:
            self.country = country.alpha_2
        self.location = data['location'] or ''

        # Experience
        self.experiences.all().delete()
        past_significant_employment = set()
        for x in data.get('member_experience_collection', []):
            if not x.get('deleted'):

                duration = x.get('duration')
                if duration:
                    duration_seconds = parse_duration(duration)
                    if duration_seconds:
                        duration = datetime.timedelta(seconds=duration_seconds)
                    else:
                        duration = None

                company_name = x.get('company_name') or ''
                self.experiences.create(
                    company_name=company_name,
                    title=x.get('title') or '',
                    location=x.get('location') or '',
                    description=x.get('description') or '',
                    linkedin_url=x.get('company_url') or '',
                    date_to=standardize_partial_date_str(x.get('date_to') or ''),
                    date_from=standardize_partial_date_str(x.get('date_from') or ''),
                    duration=duration,
                    extras={'_src': 'coresignal'}
                )

                if company_name:
                    if self.company:
                        if self.company.name != company_name:
                            past_significant_employment.add(company_name)
                    else:
                        past_significant_employment.add(company_name)

        self.past_significant_employment = list(past_significant_employment)

        # Education
        self.educations.all().delete()
        for e in data.get('member_education_collection', []):
            if not e.get('deleted'):

                self.educations.create(
                    institution_name=e.get('title') or '',
                    program_name=e.get('subtitle') or '',
                    description=e.get('description') or '',
                    linkedin_url=e.get('school_url') or '',
                    date_to=standardize_partial_date_str(e.get('date_to') or ''),
                    date_from=standardize_partial_date_str(e.get('date_from') or ''),
                    extras={'_src': 'coresignal'}
                )

        self.save()
        return data

    def pull_openai_attrs(self):
        """Extract and save additional founder attributes using OpenAI."""

        educations = self.educations.values()
        experiences = self.experiences.values()

        company_name = self.company.name if self.company else ''
        extra_attrs = extract_founder_attrs(
            founder={
                'name': self.name,
                'company_name': company_name,
            },
            education=list(educations),
            experience=list(experiences),
        )

        if not extra_attrs:
            return

        self.bachelor_degree_type = extra_attrs.get('bachelor_degree_type') or ''
        self.bachelor_grad_year = extra_attrs.get('bachelor_grad_year')
        self.bachelor_school = extra_attrs.get('bachelor_school') or ''
        self.graduate_degree_type = extra_attrs.get('graduate_degree_type') or ''
        self.graduate_school = extra_attrs.get('graduate_school') or ''
        self.has_military_or_govt_background = extra_attrs.get('has_military_or_govt_background')
        self.military_or_govt_background = extra_attrs.get('military_or_govt_background') or []
        self.prior_founding_count = extra_attrs.get('prior_founding_count')

        update_fields = [
            'bachelor_degree_type',
            'bachelor_grad_year',
            'bachelor_school',
            'graduate_degree_type',
            'graduate_school',
            'has_military_or_govt_background',
            'military_or_govt_background',
            'prior_founding_count',
        ]

        self.save(update_fields=update_fields)

        return extra_attrs


class FounderExperience(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    founder = models.ForeignKey(
        Founder,
        related_name='experiences',
        related_query_name='experience',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('founder')
    )
    company_name = models.CharField(_('company name'), max_length=255, blank=True)
    title = models.CharField(_('title'), max_length=255, blank=True)
    location = models.CharField(_('location'), max_length=255, blank=True)
    description = models.TextField(_('description'), blank=True)
    website = models.URLField(_('website'), blank=True)
    linkedin_url = models.URLField(_('linkedin URL'), blank=True)
    date_from = models.CharField(_('from date'), max_length=255, blank=True)
    date_to = models.CharField(_('to date'), max_length=255, blank=True)
    duration = models.DurationField(_('duration'), null=True, blank=True)
    extras = models.JSONField(_('extras'), default=dict, blank=True)

    created_at = models.DateTimeField(
      'created at',
      auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _('Founder Experience')
        verbose_name_plural = _('Founders Experiences')

    def __str__(self):
        components = []
        if self.date_to and self.date_from:
            components.append(f'{self.date_from} - {self.date_to}')
        elif self.date_from:
            components.append(f'from {self.date_from}')
        elif self.date_to:
            components.append(f'to {self.date_to}')

        components += [self.company_name, self.title]
        return ': '.join(components)


class FounderEducation(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    founder = models.ForeignKey(
        Founder,
        related_name='educations',
        related_query_name='education',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('founder'),
    )
    institution_name = models.CharField(_('institution name'), max_length=255, blank=True)
    program_name = models.CharField(_('program'), max_length=255, blank=True)
    description = models.TextField(_('description'), blank=True)
    website = models.URLField(_('institution website'), blank=True)
    linkedin_url = models.URLField(_('institution linkedin URL'), blank=True)
    date_from = models.CharField(_('from date'), max_length=255, blank=True)
    date_to = models.CharField(_('to date'), max_length=255, blank=True)
    extras = models.JSONField(_('extras'), default=dict, blank=True)

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
        verbose_name = _('Founder Education')
        verbose_name_plural = _('Founders Education')

    def __str__(self):
        return f'{self.program_name}: {self.institution_name}'
