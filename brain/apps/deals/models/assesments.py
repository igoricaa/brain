import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from .base import DealAssessmentConfidence, DealFollowUp, DealNonNumericScore, DealQualityPercentile

__all__ = ['DealAssessment']


class DealAssessment(models.Model):

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    deal = models.ForeignKey(
        'deals.Deal',
        on_delete=models.CASCADE,
        related_name='assessments',
        related_query_name='assessment',
        verbose_name=_('deal'),
    )

    problem_solved = models.TextField(_('problem solved'), blank=True)
    solution = models.TextField(_('product/solution'), blank=True)
    thesis_fit_evaluation = models.TextField(_('thesis fit evaluation'), blank=True)
    thesis_fit_score = models.FloatField(_('thesis fit score'), blank=True, null=True)
    customer_traction = models.TextField(_('customer traction'), blank=True)
    intellectual_property = models.TextField(_('intellectual property'), blank=True)
    business_model = models.TextField(_('business model'), blank=True)
    tam = models.TextField(_('total addressable market'), blank=True)
    competition = models.TextField(_('competition'), blank=True)
    pros = models.TextField(_('pros'), blank=True)
    cons = models.TextField(_('cons'), blank=True)
    investment_rationale = models.TextField(_('investment rationale'), blank=True)

    quality_percentile = models.CharField(
        _('quality percentile'),
        choices=DealQualityPercentile,
        max_length=50,
        blank=True,
    )

    numeric_score = models.FloatField(_('numeric score'), blank=True, null=True)

    non_numeric_score = models.CharField(
        _('non numeric score'),
        choices=DealNonNumericScore,
        max_length=50,
        blank=True,
    )

    confidence = models.CharField(
        _('confidence'),
        choices=DealAssessmentConfidence,
        max_length=50,
        blank=True,
        help_text=_('Based on data completeness'),
    )

    recommendation = models.CharField(
        _('recommendation'),
        choices=DealFollowUp,
        max_length=50,
        blank=True,
    )

    auto_problem_solved = models.TextField(
        _('problem solved (automated)'),
        blank=True,
        editable=False,
    )
    auto_solution = models.TextField(
        _('product/solution (automated)'),
        blank=True,
        editable=False,
    )
    auto_thesis_fit_evaluation = models.TextField(
        _('thesis fit evaluation (automated)'),
        blank=True,
        editable=False,
    )
    auto_thesis_fit_score = models.FloatField(
        _('thesis fit score (automated)'),
        blank=True,
        null=True,
        editable=False,
    )
    auto_customer_traction = models.TextField(
        _('customer traction'),
        blank=True,
        editable=False,
    )
    auto_intellectual_property = models.TextField(
        _('intellectual property (automated)'),
        blank=True,
        editable=False,
    )
    auto_business_model = models.TextField(_('business model (automated)'), blank=True, editable=False)
    auto_tam = models.TextField(_('total addressable market (automated)'), blank=True, editable=False)
    auto_competition = models.TextField(_('competition (automated)'), blank=True, editable=False)

    auto_quality_percentile = models.CharField(
        _('quality percentile (automated)'),
        choices=DealQualityPercentile,
        max_length=50,
        blank=True,
        editable=False,
    )

    auto_numeric_score = models.FloatField(
        _('numeric score (automated)'),
        blank=True,
        null=True,
        editable=False,
    )

    auto_non_numeric_score = models.CharField(
        _('non numeric score (automated)'),
        choices=DealNonNumericScore,
        max_length=50,
        blank=True,
        editable=False,
    )

    auto_confidence = models.CharField(
        _('confidence (automated)'),
        choices=DealAssessmentConfidence,
        max_length=50,
        blank=True,
        help_text=_('Based on data completeness'),
        editable=False,
    )

    auto_pros = models.TextField(_('pros (automated)'), blank=True, editable=False)
    auto_cons = models.TextField(_('cons (automated)'), blank=True, editable=False)
    auto_recommendation = models.CharField(
        _('recommendation (automated)'),
        choices=DealFollowUp,
        max_length=50,
        blank=True,
        editable=False,
    )
    auto_investment_rationale = models.TextField(
        _('investment rationale (automated)'),
        blank=True,
        editable=False,
    )
    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Deal Assessment')
        verbose_name_plural = _('Deal Assessments')

    def __str__(self):
        return _('%(deal)s assessment') % {'deal': self.deal}
