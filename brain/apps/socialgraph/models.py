import datetime
import re
import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

from django_countries.fields import CountryField
from polymorphic.models import PolymorphicModel
from pytimeparse2 import parse as parse_duration

from aindex.coresignal import CoresignalAPI
from aindex.openai import extract_profile_attrs
from aindex.utils import get_country, standardize_partial_date_str

__all__ = ['Profile', 'Experience', 'Education']


class Profile(PolymorphicModel):
    """Individual profile enriched with professional and educational backgrounds."""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    name = models.CharField(_('name'), max_length=255)
    bio = models.TextField(_('description'), blank=True)
    linkedin_url = models.URLField(_('Linkedin URL'), blank=True, null=True, unique=True)
    website = models.URLField(_('website'), blank=True)

    country = CountryField(_('country'), blank=True)
    location = models.CharField(_('location'), max_length=255, blank=True)

    bachelor_grad_year = models.PositiveIntegerField(_("bachelor's graduation year"), null=True, blank=True)

    bachelor_degree_type = models.CharField(_("bachelor's degree type"), max_length=128, blank=True)

    bachelor_school = models.CharField(_("bachelor's school"), max_length=255, blank=True)

    graduate_degree_type = models.CharField(_('graduate degree type'), max_length=128, blank=True)

    graduate_school = models.CharField(_('graduate school'), max_length=255, blank=True)

    phd_school = models.CharField(
        _('PHD school'),
        max_length=255,
        blank=True,
    )

    has_military_or_govt_background = models.BooleanField(
        _('has government or military background'), null=True, blank=True
    )

    military_or_govt_background = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('government or military background'),
        help_text=_('example: government agency, army, air force, navy'),
    )

    extras = models.JSONField(_('extras'), default=dict, blank=True)

    created_at = models.DateTimeField('created at', auto_now_add=True, db_default=Now())
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Profile')
        verbose_name_plural = _('Profiles')

    def __str__(self):
        return self.name

    @property
    def linkedin_shorthand_name(self):
        """LinkedIn shorthand name."""
        if not self.linkedin_url:
            return None

        # https://www.linkedin.com/in/{}
        match = re.match(r'https?://(?:www.)?linkedin.com/in/(?P<permalink>[-\w]+)', self.linkedin_url)
        if match:
            return match.groupdict().get('permalink')
        else:
            return None

    def get_coresignal_filter_params(self):
        """Returns a dictionary of filtering paramenter to be used for search the profile via Coresignal API

        Returns:
            dict
        """

        return {
            'name': self.name,
            'location': self.location or settings.CORESIGNAL_DEFAULT_SEARCH_LOCATION,
            'linkedin_shorthand_name': self.linkedin_shorthand_name,
            'company_website': None,
            'company_name': None,
        }

    def pull_coresignal_data(self, raise_for_status=False, overwrite_education=True, overwrite_experience=True):
        """Pull data from Coresignal."""
        coresignal = CoresignalAPI(raise_for_status=raise_for_status)

        data = None

        params = self.get_coresignal_filter_params()
        filters = {'name': params.get('name')}

        linkedin_shorthand_name = params.get('linkedin_shorthand_name')
        if linkedin_shorthand_name:
            _data = coresignal.get_member(linkedin_shorthand_name)
            if 'id' in _data:
                data = _data

        company_website = params.get('company_website')
        if not data and company_website:
            filters['experience_company_website_url'] = company_website
            data = coresignal.search_member(**filters)
            if not data:
                filters.pop('experience_company_website_url', None)

        company_name = params.get('company_name')
        if not data and company_name:
            filters['experience_company_name'] = company_name
            data = coresignal.search_member(**filters)
            if not data:
                filters.pop('experience_company_name', None)

        location = params.get('location')
        if not data:
            filters['location'] = location
            data = coresignal.search_member(**filters)

        if not data:
            return None

        bio = data['summary']
        if bio:
            self.bio = bio

        linkedin_url = data['canonical_url']
        if linkedin_url:
            self.linkedin_url = linkedin_url

        country = get_country(data['country'])
        if country:
            self.country = country.alpha_2

        location = data['location']
        if location:
            self.location = location
        elif country:
            self.location = country.common_name

        # Experience
        if overwrite_experience:
            self.experiences.all().delete()

        for x in data.get('member_experience_collection', []):
            if not x.get('deleted'):

                duration = x.get('duration')
                if duration:
                    duration_seconds = parse_duration(duration)
                    if duration_seconds:
                        duration = datetime.timedelta(seconds=duration_seconds)
                    else:
                        duration = None

                x_company_name = x.get('company_name') or ''
                self.experiences.create(
                    company_name=x_company_name,
                    title=x.get('title') or '',
                    location=x.get('location') or '',
                    description=x.get('description') or '',
                    linkedin_url=x.get('company_url') or '',
                    date_to=standardize_partial_date_str(x.get('date_to') or ''),
                    date_from=standardize_partial_date_str(x.get('date_from') or ''),
                    duration=duration,
                    extras={'_src': 'coresignal'},
                )

        # Education
        if overwrite_education:
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
                    extras={'_src': 'coresignal'},
                )

        self.save()
        return data

    def pull_openai_attrs(self):
        """Extract and save additional profile attributes using OpenAI."""

        educations = self.educations.values()
        experiences = self.experiences.values()

        extra_attrs = extract_profile_attrs(
            profile={
                'name': self.name,
            },
            education=list(educations),
            experience=list(experiences),
        )

        if not extra_attrs:
            return

        print(extra_attrs)
        update_fields = [
            'bachelor_degree_type',
            'bachelor_grad_year',
            'bachelor_school',
            'graduate_degree_type',
            'graduate_school',
            'has_military_or_govt_background',
            'military_or_govt_background',
            'updated_at',
        ]

        self.bachelor_degree_type = extra_attrs.get('bachelor_degree_type') or ''
        self.bachelor_grad_year = extra_attrs.get('bachelor_grad_year')
        self.bachelor_school = extra_attrs.get('bachelor_school') or ''
        self.graduate_degree_type = extra_attrs.get('graduate_degree_type') or ''
        self.graduate_school = extra_attrs.get('graduate_school') or ''
        self.has_military_or_govt_background = extra_attrs.get('has_military_or_govt_background')
        self.military_or_govt_background = extra_attrs.get('military_or_govt_background') or []

        self.save(update_fields=update_fields)

        return extra_attrs


class Experience(models.Model):
    """Professional experience for a profile."""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    profile = models.ForeignKey(
        Profile,
        related_name='experiences',
        related_query_name='experience',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('profile'),
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

    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _('Professional Experience')
        verbose_name_plural = _('Professional Experiences')

    @property
    def display_name(self):
        components = []
        if self.date_to and self.date_from:
            components.append(f'{self.date_from} - {self.date_to}')
        elif self.date_from:
            components.append(f'from {self.date_from}')
        elif self.date_to:
            components.append(f'to {self.date_to}')

        components += [self.company_name, self.title]
        return ': '.join(components)

    def __str__(self):
        return self.display_name


class Education(models.Model):
    """Educational qualification for a profile."""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    profile = models.ForeignKey(
        Profile,
        related_name='educations',
        related_query_name='education',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_('profile'),
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
        verbose_name = _('Education')
        verbose_name_plural = _('Education')

    def __str__(self):
        return f'{self.program_name}: {self.institution_name}'
