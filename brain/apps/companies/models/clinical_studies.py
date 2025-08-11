import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

__all__ = ['ClinicalStudy']


class ClinicalStudy(models.Model):

    ACTIVE_NOT_RECRUITING = 'ACTIVE_NOT_RECRUITING'
    COMPLETED = 'COMPLETED'
    ENROLLING_BY_INVITATION = 'ENROLLING_BY_INVITATION'
    NOT_YET_RECRUITING = 'NOT_YET_RECRUITING'
    RECRUITING = 'RECRUITING'
    SUSPENDED = 'SUSPENDED'
    TERMINATED = 'TERMINATED'
    WITHDRAWN = 'WITHDRAWN'
    AVAILABLE = 'AVAILABLE'
    NO_LONGER_AVAILABLE = 'NO_LONGER_AVAILABLE'
    TEMPORARILY_NOT_AVAILABLE = 'TEMPORARILY_NOT_AVAILABLE'
    APPROVED_FOR_MARKETING = 'APPROVED_FOR_MARKETING'
    WITHHELD = 'WITHHELD'
    UNKNOWN = 'UNKNOWN'

    STATUS_CHOICES = {
        ACTIVE_NOT_RECRUITING: _('Active, not recruiting'),
        COMPLETED: _('Completed'),
        ENROLLING_BY_INVITATION: _('Enrolling by invitation'),
        NOT_YET_RECRUITING: _('Not yet recruiting'),
        RECRUITING: _('Recruiting'),
        SUSPENDED: _('Suspended'),
        TERMINATED: _('Terminated'),
        WITHDRAWN: _('Withdrawn'),
        AVAILABLE: _('Available'),
        NO_LONGER_AVAILABLE: _('No longer available'),
        TEMPORARILY_NOT_AVAILABLE: _('Temporarily not available'),
        APPROVED_FOR_MARKETING: _('Approved for marketing'),
        WITHHELD: _('Withheld'),
        UNKNOWN: _('Unknown status'),
    }

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    company = models.ForeignKey(
        'companies.Company',
        related_name='clinical_studies',
        related_query_name='clinical_study',
        on_delete=models.CASCADE,
        verbose_name=_('company'),
    )

    nct_id = models.CharField(
        _('NCT ID'),
        max_length=255,
        blank=True,
        db_index=True,
        help_text=_(
            'National Clinical Trial (NCT) ID given to each clinical study ' 'upon registration at ClinicalTrials.gov'
        ),
    )

    title = models.CharField(_('title'), max_length=512)

    lead_sponsor_name = models.CharField(_('lead sponsor name'), max_length=255, blank=True)

    collaborators_names = ArrayField(
        models.CharField(max_length=255), default=list, blank=True, verbose_name=_('collaborators names')
    )

    description = models.TextField(_('description'), blank=True)

    start_date_str = models.CharField(_('start date'), max_length=255, blank=True, db_index=True)
    completion_date_str = models.CharField(_('start date'), max_length=255, blank=True, db_index=True)

    status = models.CharField(_('status'), choices=STATUS_CHOICES, max_length=255, blank=True)

    created_at = models.DateTimeField('created at', auto_now_add=True, db_default=Now())
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Clinical Study')
        verbose_name_plural = _('Clinical Studies')

    def __str__(self):
        return self.title

    @property
    def ctg_url(self):
        if not self.nct_id:
            return None

        return f'https://clinicaltrials.gov/study/{self.nct_id}'
