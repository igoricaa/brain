import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

__all__ = [
    'OperatingStatus',
    'CompanyType',
    'AcquisitionType',
    'AcquisitionTerms',
    'NUM_EMPLOYEES_RANGE_CHOICES',
    'REVENUE_RANGE_CHOICES',
    'TechnologyType',
    'FundingType',
    'FundingStage',
    'InvestorType',
    'IPOStatus',
    'Industry',
]


class OperatingStatus(models.TextChoices):
    ACTIVE = 'active', _('Active')
    CLOSED = 'closed', _('Closed')


class CompanyType(models.TextChoices):
    FOR_PROFIT = 'for_profit', _('For Profit')
    NON_PROFIT = 'non_profit', _('Non-Profit')


class AcquisitionType(models.TextChoices):
    ACQUIHIRE = 'acquihire', _('Acquihire')
    ACQUISITION = 'acquisition', _('Acquisition')
    LBO = 'lbo', _('Leveraged Buyout')
    MANAGEMENT_BUYOUT = 'management_buyout', _('Management Buyout')
    MERGER = 'merge', _('Merger')


class AcquisitionTerms(models.TextChoices):
    CASH = 'cash', _('Cash')
    CASH_AND_STOCK = 'cash_and_stock', _('Cash & Stock')
    STOCK = 'stock', _('Stock')


NUM_EMPLOYEES_RANGE_CHOICES = {
    (1, 11): '1-10',
    (11, 51): '11-50',
    (51, 101): '51-100',
    (101, 251): '101-250',
    (251, 501): '251-500',
    (501, 1001): '501-1000',
    (1001, 5001): '1001-5000',
    (5001, 10001): '5001-10000',
    (10001, None): '10001+'
}

REVENUE_RANGE_CHOICES = {
    (None, 1_000_000): 'Less than $1M',
    (1_000_000, 10_000_000): '$1M to $10M',
    (10_000_000, 50_000_000): '$10M to $50M',
    (50_000_000, 100_000_000): '$50M to $100M',
    (100_000_000, 500_000_000): '$100M to $500M',
    (500_000_000, 1000_000_000): '$500M to $1B',
    (1000_000_000, 10_000_000_000): '$1B to $10B',
    (10_000_000_000, None): '$10B+'
}


class TechnologyType(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
        verbose_name = _('Technology Type')
        verbose_name_plural = _('Technology Types')

    def __str__(self):
        return self.name


class FundingType(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
        verbose_name = _('Funding Type')
        verbose_name_plural = _('Funding Types')

    def __str__(self):
        return self.name


class FundingStage(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
        verbose_name = _('Funding Stage')
        verbose_name_plural = _('Funding Stages')

    def __str__(self):
        return self.name


class InvestorType(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
        verbose_name = _('Investor Type')
        verbose_name_plural = _('Investors Types')

    def __str__(self):
        return self.name


class IPOStatus(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
        verbose_name = _('IPO Status')
        verbose_name_plural = _('IPO Statuses')

    def __str__(self):
        return self.name


class Industry(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255, unique=True)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)

    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

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
