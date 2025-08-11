import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

__all__ = ['PatentApplication']


class PatentApplication(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    company = models.ForeignKey(
        'companies.Company',
        related_name='patent_applications',
        related_query_name='patent_application',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('company')
    )

    patent_number = models.CharField(_('patent number'), max_length=255, blank=True)
    number = models.CharField(_('application number'), max_length=255, blank=True, null=True)
    confirmation_number = models.SmallIntegerField(
        _('application confirmation number'),
        blank=True,
        null=True
    )

    invention_title = models.CharField(
        _('invention/application title'),
        max_length=255,
        blank=True,
        help_text=_('Clear and concise technical description of the invention as provided by the patent applicant.')
    )

    first_inventor_name = models.CharField(
        _('first inventor name'),
        max_length=255,
        blank=True,
        help_text=_('Name of the inventor with Rank One. Listed as first inventor in the patent application.')
    )

    first_applicant_name = models.CharField(
        _('first applicant name'),
        max_length=255,
        blank=True,
        help_text=_('Name of the Applicant with Rank One. Listed as first applicant in the patent application.')
    )

    status_code = models.CharField(_('status code'), max_length=255, blank=True)
    status_description = models.CharField(_('status description'), max_length=255, blank=True)
    status_date = models.DateField(_('status date'), blank=True, null=True)

    type_code = models.CharField(
        _('application type code'),
        max_length=64,
        blank=True,
        help_text=_('The specific value that indicates if the received patent application is considered a '
                    'domestic application at the National Stage or is submitted as a Patent Cooperative '
                    'Treaty (PCT) application.')
    )
    type_label = models.CharField(_('application type label'), max_length=128, blank=True)
    type_category = models.CharField(_('application type category'), max_length=128, blank=True)

    filing_date = models.DateField(_('filing date'), blank=True, null=True)
    grant_date = models.DateField(_('grant date'), blank=True, null=True)

    earliest_publication_date = models.DateField(_('earliest publication date'), blank=True, null=True)
    earliest_publication_number = models.CharField(
        _('earliest publication number'),
        max_length=128,
        blank=True,
    )

    pct_publication_date = models.CharField(_('PCT publication date'), max_length=128, blank=True)
    pct_publication_number = models.CharField(_('PCT publication number'), max_length=128, blank=True)

    publication_categories = ArrayField(
        models.CharField(max_length=128),
        default=list,
        blank=True,
        verbose_name=_('publication categories')
    )

    publication_dates = ArrayField(
        models.CharField(max_length=64),
        default=list,
        blank=True,
        verbose_name=_('publication dates')
    )

    publication_sequence_numbers = ArrayField(
        models.CharField(max_length=64),
        default=list,
        blank=True,
        verbose_name=_('publication sequence numbers'),
        help_text=_('Contains a number assigned to the publication of patent applications filed on or after '
                    'November 29, 2000. It includes the year, followed by a seven digit number, followed by '
                    'a kind code. Example: 200011234567A1.')
    )

    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True,
        db_default=Now(),
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True
    )

    extras = models.JSONField(_('extras'), blank=True, default=dict)

    class Meta:
        verbose_name = _('Patent Application')
        verbose_name_plural = _('Patent Applications')
        constraints = [
            models.UniqueConstraint(
                fields=['number', 'company_id'],
                name='%(app_label)s_%(class)s_number_company_id'
            ),
        ]

    def __str__(self):
        return self.invention_title

    @property
    def company_name(self):
        if self.company:
            return self.company.name
