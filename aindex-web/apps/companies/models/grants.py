import datetime
import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

__all__ = ['Grant']


class Grant(models.Model):

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    company = models.ForeignKey(
        'companies.Company',
        related_name='grants',
        related_query_name='grant',
        on_delete=models.CASCADE,
        verbose_name=_('company')
    )

    name = models.CharField(_('name'), max_length=255, blank=True)

    potential_amount = models.DecimalField(
        _('potential amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )
    obligated_amount = models.DecimalField(
        _('obligated amount (USD)'),
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True
    )

    program_name = models.CharField(_('program name'), max_length=255, blank=True)
    phase = models.CharField(_('phase'), max_length=255, blank=True)
    branch = models.CharField(_('branch'), max_length=255, blank=True)

    sbir_id = models.CharField(_('SBIR award ID'), max_length=255, blank=True)

    award_year = models.PositiveIntegerField(_('award year'), blank=True, null=True)
    award_month = models.PositiveIntegerField(
        _('award month'),
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    award_date = models.DateField(_('award date'), blank=True, null=True)

    description = models.TextField(_('description'), blank=True)
    granting_agency = models.CharField(_('granting agency'), max_length=255, blank=True)

    extras = models.JSONField(_('extras'), default=dict, blank=True)

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
        verbose_name = _('Grant')
        verbose_name_plural = _('Grants')
        indexes = [
            models.Index(
                fields=['award_year', 'award_month'],
                name='companies_grant_award_ym_idx'
            )
        ]

    def __str__(self):
        return self.name

    @property
    def award_url(self):
        if self.sbir_id:
            return f'https://www.sbir.gov/awards/{self.sbir_id}'

    @property
    def award_date_display(self):
        if self.award_date:
            return self.award_date
        elif self.award_month and self.award_year:
            date = datetime.datetime(self.award_year, self.award_month, 1)
            return date.strftime('%b. %Y')
        elif self.award_year:
            return self.award_year
