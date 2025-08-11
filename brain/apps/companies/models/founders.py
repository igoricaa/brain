from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

from aindex.openai import extract_founder_attrs

from socialgraph.models import Profile

__all__ = ['Founder', 'Founding', 'Advisor', 'CompanyAdvisor']


class Founder(Profile):

    class Meta:
        verbose_name = _('Founder')
        verbose_name_plural = _('Founders')

    def __str__(self):
        return self.name


class Founding(models.Model):
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='foundings',
        related_query_name='founding',
        verbose_name=_('company'),
    )

    founder = models.ForeignKey(
        'companies.Founder',
        on_delete=models.CASCADE,
        related_name='foundings',
        related_query_name='founding',
        verbose_name=_('founder'),
    )

    title = models.CharField(_('title'), max_length=255, blank=True)

    age_at_founding = models.PositiveIntegerField(
        _('age at founding'),
        null=True,
        blank=True,
        help_text=_('Can be estimated based on assumption the founder graduated with 22 years old.'),
    )

    prior_founding_count = models.PositiveIntegerField(_('number of prior founding attempts'), null=True, blank=True)

    past_significant_employments = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('past significant employments'),
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
        verbose_name = _('Founding')
        verbose_name_plural = _('Founding')

    def save(self, *args, **kwargs):
        if not self.age_at_founding:
            self.age_at_founding = self.estimate_age_at_founding()
        return super().save(*args, **kwargs)

    @property
    def founder_uuid(self):
        return self.founder.uuid

    @property
    def founder_name(self):
        return self.founder.name

    @property
    def founder_linkedin_url(self):
        return self.founder.linkedin_url

    @property
    def company_uuid(self):
        return self.company.uuid

    @property
    def company_name(self):
        return self.company.name

    @property
    def company_website(self):
        return self.company.website

    @property
    def company_image(self):
        return self.company.image

    def estimate_age_at_founding(self):
        # estimate age based on bachelor grad year,
        # assuming 22 years old on grad year
        if self.founder.bachelor_grad_year and self.company.year_founded:
            return self.company.year_founded - self.founder.bachelor_grad_year + 22

        return None

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        return f'{self.founder}: {self.company}'

    def pull_openai_attrs(self):
        """Extract and save additional founder attributes using OpenAI."""

        educations = self.founder.educations.values()
        experiences = self.founder.experiences.values()

        extra_attrs = extract_founder_attrs(
            founder={
                'name': self.founder.name,
                'company_name': self.company.name,
            },
            education=list(educations),
            experience=list(experiences),
        )

        if not extra_attrs:
            return None

        update_fields = [
            'prior_founding_count',
            'past_significant_employments',
            'updated_at',
        ]

        if not self.title:
            self.title = extra_attrs.get('title') or ''
            update_fields.append('title')
        self.prior_founding_count = extra_attrs.get('prior_founding_count')

        self.past_significant_employments = extra_attrs.get('past_significant_employments') or []

        self.save(update_fields=update_fields)

        return extra_attrs


class Advisor(Profile):

    class Meta:
        verbose_name = _('Advisor')
        verbose_name_plural = _('Advisors')

    def __str__(self):
        return self.name


class CompanyAdvisor(models.Model):

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='company_advisors',
        related_query_name='company_advisor',
        verbose_name=_('company'),
    )

    advisor = models.ForeignKey(
        Advisor,
        on_delete=models.CASCADE,
        related_name='company_advisors',
        related_query_name='company_advisor',
        verbose_name=_('advisor'),
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
        verbose_name = _('Company advisor')
        verbose_name_plural = _('Company advisors')
