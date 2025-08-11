import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

__all__ = [
    'DualUseCategory',
    'DualUseSignal',
    'DealStatus',
    'DealFollowUp',
    'DealQualityPercentile',
    'DealNonNumericScore',
    'DealAssessmentConfidence',
]


class DealStatus(models.TextChoices):
    NEW = 'new', _('new')
    ACTIVE = 'active', _('active')
    SUBCOMMITTEE_VETTING = 'subcommittee vetting', _('subcommittee vetting')


class DealFollowUp(models.TextChoices):
    PREP_TO_CALL = 'prep to call', _('prep to call')
    PREP_TO_PASS = 'prep to pass', _('prep to pass')


class DealQualityPercentile(models.TextChoices):
    TOP_1_PERCENT = 'top 1%', _('most interesting')
    TOP_5_PERCENT = 'top 5%', _('very interesting')
    TOP_10_PERCENT = 'top 10%', _('interesting')
    TOP_20_PERCENT = 'top 20%', _('potentially interesting')
    TOP_50_PERCENT = 'top 50%', _('not interesting')


class DealNonNumericScore(models.TextChoices):
    EXCELLENT = 'excellent', _('Excellent')
    GOOD = 'good', _('Good')
    AVERAGE = 'average', _('Average')
    BELOW_AVERAGE = 'below average', _('Below average')


class DealAssessmentConfidence(models.TextChoices):
    HIGH = 'high', _('High')
    LOW = 'low', _('Low')


class DualUseCategory(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    name = models.CharField(_('name'), max_length=255)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)
    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Dual use category')
        verbose_name_plural = _('Dual use categories')

    def __str__(self):
        return self.name


class DualUseSignal(models.Model):
    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )
    category = models.ForeignKey(
        DualUseCategory,
        related_name='signals',
        related_query_name='signal',
        verbose_name='category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(_('name'), max_length=255)
    code = models.CharField(_('code'), max_length=255, blank=True, null=True, unique=True)
    description = models.TextField(_('description'), blank=True)
    bg_color = models.CharField(_('background color'), max_length=255, blank=True)
    text_color = models.CharField(_('text color'), max_length=255, blank=True)

    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Dual use signal')
        verbose_name_plural = _('Dual use signals')

    def __str__(self):
        return self.name
