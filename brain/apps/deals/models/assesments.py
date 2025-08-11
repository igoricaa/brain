import uuid

from django.contrib.postgres.fields import ArrayField
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

    tags = ArrayField(models.CharField(max_length=255), default=list, blank=True, verbose_name=_('tags'))

    pros = models.TextField(_('pros'), blank=True)
    cons = models.TextField(_('cons'), blank=True)
    recommendation = models.CharField(_('recommendation'), choices=DealFollowUp, max_length=50, blank=True)
    investment_rationale = models.TextField(_('investment rationale'), blank=True)
    problem = models.TextField(_('problem'), blank=True)
    solution = models.TextField(_('product/solution'), blank=True)
    thesis_fit = models.TextField(_('thesis fit'), blank=True)
    auto_thesis_fit_score = models.FloatField(_('thesis fit score'), blank=True, null=True)
    traction = models.TextField(_('traction'), blank=True)
    intellectual_property = models.TextField(_('intellectual property'), blank=True)
    business_model = models.TextField(_('business model'), blank=True)
    market_sizing = models.TextField(_('market sizing'), blank=True)
    competition = models.TextField(_('competition'), blank=True)

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

    parent_breakthroughs = models.TextField(
        _('SOTA parent breakthroughs'),
        blank=True,
        help_text=_("What recent breakthroughs have made this technology newly possible?"),
    )

    sota_comparison = models.TextField(
        _('SOTA comparison'),
        blank=True,
        help_text=_("How does this company's technology compare to the state of the art?"),
    )

    feasibility = models.TextField(
        _('feasibility'),
        blank=True,
        help_text=_("How feasible is the company’s planned product?"),
    )

    technical_risk = models.TextField(
        _('technical risk'),
        blank=True,
        help_text=_("What are the major areas of technical risk?"),
    )

    auto_tags = ArrayField(
        models.CharField(max_length=255),
        default=list,
        blank=True,
        verbose_name=_('tags'),
        editable=False,
    )

    auto_pros = models.TextField(_('pros'), blank=True, editable=False)
    auto_cons = models.TextField(_('cons'), blank=True, editable=False)
    auto_recommendation = models.CharField(
        _('recommendation'),
        choices=DealFollowUp,
        max_length=50,
        blank=True,
        editable=False,
    )
    auto_investment_rationale = models.TextField(
        _('investment rationale'),
        blank=True,
        editable=False,
    )
    auto_problem = models.TextField(
        _('problem'),
        blank=True,
        editable=False,
    )
    auto_solution = models.TextField(
        _('product/solution'),
        blank=True,
        editable=False,
    )
    auto_thesis_fit = models.TextField(
        _('thesis fit'),
        blank=True,
        editable=False,
    )
    auto_auto_thesis_fit_score = models.FloatField(_('thesis fit score'), blank=True, null=True, editable=False)
    auto_traction = models.TextField(
        _('traction'),
        blank=True,
        editable=False,
    )
    auto_intellectual_property = models.TextField(_('intellectual property'), blank=True, editable=False)
    auto_business_model = models.TextField(_('business model'), blank=True, editable=False)
    auto_market_sizing = models.TextField(_('market sizing'), blank=True, editable=False)
    auto_competition = models.TextField(_('competition'), blank=True, editable=False)

    auto_quality_percentile = models.CharField(
        _('quality percentile'),
        choices=DealQualityPercentile,
        max_length=50,
        blank=True,
        editable=False,
    )

    auto_numeric_score = models.FloatField(_('numeric score'), blank=True, null=True, editable=False)

    auto_non_numeric_score = models.CharField(
        _('non numeric score'),
        choices=DealNonNumericScore,
        max_length=50,
        blank=True,
        editable=False,
    )

    auto_confidence = models.CharField(
        _('confidence'),
        choices=DealAssessmentConfidence,
        max_length=50,
        blank=True,
        help_text=_('Based on data completeness'),
        editable=False,
    )

    auto_parent_breakthroughs = models.TextField(
        _('SOTA parent breakthroughs'),
        blank=True,
        help_text=_("What recent breakthroughs have made this technology newly possible?"),
        editable=False,
    )

    auto_sota_comparison = models.TextField(
        _('SOTA comparison'),
        blank=True,
        help_text=_("How does this company's technology compare to the state of the art?"),
        editable=False,
    )

    auto_feasibility = models.TextField(
        _('feasibility'),
        blank=True,
        help_text=_("How feasible is the company’s planned product?"),
        editable=False,
    )

    auto_technical_risk = models.TextField(
        _('technical risk'),
        blank=True,
        help_text=_("What are the major areas of technical risk?"),
        editable=False,
    )

    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = _('Deal Assessment')
        verbose_name_plural = _('Deal Assessments')

    def __str__(self):
        return _('%(deal)s assessment') % {'deal': self.deal}
