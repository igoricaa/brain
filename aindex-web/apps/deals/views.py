import itertools
import operator
from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.contrib.postgres.expressions import ArraySubquery
from django.contrib.postgres.search import SearchVector
from django.db import transaction
from django.db.models import Count, Exists, F, OuterRef, Q, Sum
from django.db.models.functions import JSONObject, TruncDate
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.text import format_lazy
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _
from django.views import View
from django.views.generic import CreateView, DeleteView, DetailView, TemplateView, UpdateView
from django.views.generic.detail import SingleObjectMixin

from common.utils import previous_month_date_range, previous_week
from companies.models import ClinicalStudy, Grant
from el_pagination.views import AjaxListView

from .forms import DealAssessmentForm, DealUpdateForm, DeckForm
from .models import Deal, Deck, DualUseCategory, DualUseSignal, MissedDeal
from .tasks import refresh_deal_data, send_deal_to_affinity


class DeckCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Deck
    form_class = DeckForm
    template_name = 'deals/deck_create.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Add Deck'
        return context

    def is_ajax(self):
        return self.request.headers.get('x-requested-with') == 'XMLHttpRequest'

    def form_invalid(self, form):
        if self.is_ajax():
            return JsonResponse(
                {
                    'success': False,
                    'error': form.errors['file']
                },
                status=400)
        return super().form_invalid(form)

    def form_valid(self, form):
        user = self.request.user

        form.instance.creator = user

        deal = form.instance.build_deal()
        deal.creator = user
        deal.save()
        form.instance.deal = deal

        return super().form_valid(form)

    def get_success_url(self):
        return reverse('deals:deal-detail', kwargs={'uuid': self.object.deal.uuid})

    def get_success_message(self, cleaned_data):
        return f"Deck '{self.object.display_name}' was successfully saved and in processing."


class FreshDealsView(LoginRequiredMixin, AjaxListView):
    model = Deal
    context_object_name = 'deal_list'
    template_name = 'deals/fresh_deals.html'
    page_template = 'deals/includes/fresh_deals.html'

    def get_queryset(self):
        queryset = super().get_queryset()

        du_categories_subquery_qs = DualUseCategory.objects\
            .filter(signal__deal=OuterRef('pk'))\
            .distinct()\
            .values(json=JSONObject(id='id', uuid='uuid', name='name', bg_color='bg_color', text_color='text_color'))
        du_categories_subquery = ArraySubquery(du_categories_subquery_qs)

        uncategorized_du_subquery = DualUseSignal.objects.filter(deal=OuterRef('pk'), category=None)
        processing_deck_subquery = Deck.objects.filter(deal=OuterRef('pk'),
                                                       ingestion_status__in=[Deck.PENDING, Deck.STARTED, Deck.RETRY])

        return queryset\
            .filter(sent_to_affinity=None)\
            .select_related('company')\
            .prefetch_related('industries', 'founder_signals', 'company__grants')\
            .annotate(grants_count=Count('company__grant'),
                      grants_obligated_amount=Sum('company__grant__obligated_amount'),
                      dual_use_categories=du_categories_subquery,
                      has_processing_deck=Exists(processing_deck_subquery),
                      has_uncategorized_dual_use_signals=Exists(uncategorized_du_subquery))\
            .order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Fresh Deals'
        return context


class ReviewedDealsView(LoginRequiredMixin, AjaxListView):
    model = Deal
    context_object_name = 'deal_list'
    template_name = 'deals/reviewed_deals.html'
    page_template = 'deals/includes/reviewed_deals.html'

    def get_queryset(self):
        queryset = super().get_queryset()

        q = self.request.GET.get('q')
        if q:
            queryset = queryset\
                .annotate(search=SearchVector('name', 'company_name'))\
                .filter(search=q)

        du_categories_subquery_qs = DualUseCategory.objects\
            .filter(signal__deal=OuterRef('pk'))\
            .distinct()\
            .values(json=JSONObject(id='id', uuid='uuid', name='name', bg_color='bg_color', text_color='text_color'))
        du_categories_subquery = ArraySubquery(du_categories_subquery_qs)

        uncategorized_du_signals_qs = DualUseSignal.objects.filter(category=None, deal=OuterRef('pk'))

        return queryset\
            .filter(sent_to_affinity__isnull=False) \
            .prefetch_related('industries', 'founder_signals', 'company__grants') \
            .annotate(grants_count=Count('company__grant'),
                      grants_obligated_amount=Sum('company__grant__obligated_amount'),
                      dual_use_categories=du_categories_subquery,
                      has_uncategorized_dual_use_signals=Exists(uncategorized_du_signals_qs)) \
            .order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Past Deals'
        return context


class DealDetailView(LoginRequiredMixin, DetailView):
    template_name = 'deals/deal_detail.html'
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_queryset(self):
        return Deal.objects.select_related('company').prefetch_related('company__patent_applications')

    def get_founders(self):
        if not self.object.company:
            return []

        return self.object.company.founders.prefetch_related('experiences', 'educations').order_by('name')

    def get_grants(self):
        if not self.object.company:
            return []
        return self.object.company.grants.order_by('-award_date')

    def get_clinical_studies(self):
        if not self.object.company:
            return []
        return self.object.company.clinical_studies.order_by('-start_date_str')

    def get_core_industries(self):
        return self.object.industries.filter(is_core=True)

    def get_other_industries(self):
        return self.object.industries.filter(is_core=False)

    def get_decks(self):
        return self.object.decks.all()

    def get_signals_categories(self):
        _signals = DualUseSignal.objects\
            .filter(deal=self.object)\
            .select_related('category')\
            .order_by('category', 'name')
        signals_categories = []

        for group_key, group_items in itertools.groupby(_signals, key=operator.attrgetter('category')):
            signals_categories.append({
                'category': group_key,
                'signals': list(group_items)
            })
        return signals_categories

    def get_assessment_form(self):
        prepopulated_fields = ['problem', 'solution', 'thesis_fit', 'traction', 'intellectual_property',
                               'business_model', 'market_sizing', 'competition']

        prepopulated_data = {}

        for field in prepopulated_fields:
            if not getattr(self.object, field):
                prepopulated_data[field] = getattr(self.object, f'auto_{field}', '')

        return DealAssessmentForm(instance=self.object, initial=prepopulated_data)

    def get_update_form(self):
        return DealUpdateForm(instance=self.object)

    def check_processing_decks(self):
        return self.object.decks.filter(ingestion_status__in=[Deck.PENDING, Deck.STARTED, Deck.RETRY]).exists()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context['company'] = self.object.company

        context['decks'] = self.get_decks()

        context['founders'] = self.get_founders()

        context['grants'] = self.get_grants()

        context['clinical_studies'] = self.get_clinical_studies()

        context['core_industries'] = self.get_core_industries()
        context['other_industries'] = self.get_other_industries()

        context['signals_categories'] = self.get_signals_categories()

        context['update_form'] = self.get_update_form()
        context['assessment_form'] = self.get_assessment_form()

        context['page_title'] = self.object.display_name
        return context


class DealUpdateView(LoginRequiredMixin, UpdateView):
    model = Deal
    form_class = DealUpdateForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'deals/deal_update.html'

    def form_valid(self, form):
        messages.success(
            self.request,
            format_lazy('{deal_name} successfully updated', deal_name=self.object.display_name)
        )
        response = super().form_valid(form)

        # update company information
        company = self.object.company
        company_name = form.cleaned_data.get('company_name', '')
        website = form.cleaned_data.get('website') or None
        state = form.cleaned_data.get('state', '')
        city = form.cleaned_data.get('city', '')
        company.name = company_name
        company.website = website
        company.hq_state_name = state
        company.hq_city_name = city
        company.save()

        # Refresh deal data
        if not set(form.changed_data).isdisjoint({'company_name', 'website', 'state', 'city'}):
            Deal.objects.filter(pk=self.object.pk).update(processing_status=Deal.PROCESSING_STATUS.PENDING)
            refresh_deal_data.delay(pk=self.object.pk)
            messages.success(
                self.request,
                format_lazy('Refreshing {deal_name} data …', deal_name=self.object.display_name)
            )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Edit deal: %(name)s') % {'name': self.object.display_name}
        return context


class DealAssessmentView(LoginRequiredMixin, UpdateView):
    model = Deal
    form_class = DealAssessmentForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'deals/deal_assessment.html'

    def form_valid(self, form):

        response = super().form_valid(form)

        if form.cleaned_data['send_to_affinity'] is True:
            transaction.on_commit(lambda: send_deal_to_affinity.delay(form.instance.pk))

            # trying to guess what will happen in an async action
            affinity_org = self.object.get_affinity_organization()
            if affinity_org:
                messages.info(
                    self.request,
                    format_lazy('{company_name} deal sent to Affinity.',
                                company_name=self.object.company_name)
                )
            else:
                # Assuming if no organization is matched the deal can't be sent to affinity.
                messages.warning(
                    self.request,
                    format_lazy(
                        'Warning: Something went wrong when posting '
                        '<a href="{deal_url}"><strong>{company_name}</strong></a> '
                        'deal to Affinity.',
                        company_name=self.object.company_name,
                        deal_url=self.object.get_absolute_url()
                    )
                )
                return HttpResponseRedirect(self.object.get_absolute_url())

        else:
            messages.success(
                self.request,
                format_lazy('{company_name} deal assessment saved.', company_name=self.object.company_name)
            )

        return response

    def get_success_url(self):
        return reverse('deals:deal-list-fresh')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('%(name)s deal assessment') % {'name': self.object.display_name}
        return context


class DealProcessingStatusView(LoginRequiredMixin, DetailView):
    model = Deal
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

    def render_to_response(self, context, **response_kwargs):
        return JsonResponse(
            {
                'ready': self.object.is_ready,
            }
        )


class DealDeleteView(LoginRequiredMixin, DeleteView):
    model = Deal
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'deals/deal_confirm_delete.html'

    def get_success_url(self):
        return reverse('deals:deal-list-fresh')

    def form_valid(self, form):
        deal_name = self.object.display_name

        # delete decks
        self.object.decks.all().delete()

        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy('{deal_name} deal deleted.', deal_name=deal_name)
        )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("Delete %(name)s") % {'name': self.object.display_name}
        return context


class DealRefreshView(LoginRequiredMixin, SingleObjectMixin, View):
    """Refresh deal data

    This will also re-fetch data pulled from external sources.
    """
    model = Deal
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        Deal.objects.filter(pk=self.object.pk).update(processing_status=Deal.PROCESSING_STATUS.PENDING)
        refresh_deal_data.delay(pk=self.object.pk)

        messages.success(
            request,
            format_lazy('Refreshing {deal_name} data …', deal_name=self.object.display_name)
        )

        return HttpResponseRedirect(self.object.get_absolute_url())

    def put(self, *args, **kwargs):
        return self.post(*args, **kwargs)


class MissedDealsListView(LoginRequiredMixin, AjaxListView):
    """Missed deals list view."""

    model = MissedDeal
    context_object_name = 'missed_deal_list'
    template_name = 'deals/missed_deal_list.html'
    page_template = 'deals/includes/missed_deal_list.html'

    def get_queryset(self):
        queryset = super().get_queryset()\
            .select_related('company', 'funding_stage', 'company__technology_type')\
            .prefetch_related('company__industries')
        return queryset.order_by('-updated_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Missed Deals')
        return context


class DealsDashboardDataView(LoginRequiredMixin, View):
    """Deals summary data view"""

    def get_queryset(self):
        return Deal.objects.all()

    def get_count_by_group(self, *args, **kwargs):
        """Aggregates the number of deals matching the main queryset grouped by specified field

        Args:
            filters (dict):
                Keyword arguments that should be used for filtering the default queryset before aggregation.

            args (str):
                Field names or expressions used for qrouping the deals when counting

            kwargs:
                Expressions used for qrouping the deals when counting passed as keyword arguments.

        Returns:
            Values Queryset
        """

        filters = kwargs.pop('filters', {})

        ordering = kwargs.pop('order_by', None)
        if isinstance(ordering, str):
            ordering = [ordering]

        queryset = self.get_queryset()
        queryset = queryset.filter(**filters)
        queryset = queryset.values(*args, **kwargs).annotate(count=Count('*'))

        if ordering:
            queryset = queryset.order_by(*ordering)

        return queryset

    def get_context_data(self):
        tz_now = now()
        _previous_week = previous_week(tz_now)
        _previous_month_range = previous_month_date_range(tz_now.date())

        # Filtering a DateTimeField with dates won’t include items on the last day,
        # because the bounds are interpreted as “0am on the given date”.
        # https://docs.djangoproject.com/en/5.0/ref/models/querysets/#range
        _previous_month_dt_range = _previous_month_range[0], _previous_month_range[1] + timedelta(days=1)

        queryset = self.get_queryset()

        # Number of deals by date
        date_count_trend = self.get_count_by_group(
            date=TruncDate('created_at'),
            filters={'created_at__gte': tz_now - timedelta(days=732)}  # ~ past 2 years
        ).order_by('date')

        # Number of deals by funding stage
        funding_stage_count = self.get_count_by_group('stage', order_by='stage')

        # Number of deals by industry
        industry_count = self.get_count_by_group(
            industry_id=F('industries__id'),
            industry_name=F('industries__name'),
            order_by='industry_name'
        )

        # Number of deals by dual use signals
        du_signal_count = self.get_count_by_group(
            signal_id=F('dual_use_signals__id'),
            signal_name=F('dual_use_signals__name'),
            order_by='-count'
        )

        # Number of deals sent to affinity
        sent_to_affinity_count = self.get_count_by_group('sent_to_affinity', order_by='-count')

        # Number of deals by city & state
        city_count = self.get_count_by_group(city_name=F('city'))
        state_count = self.get_count_by_group(state_name=F('state'))

        # Number of deals by qualitative score count
        quality_percentile_count = self.get_count_by_group(score=F('quality_percentile'), order_by='-count')
        auto_non_numeric_score_count = self.get_count_by_group(score=F('auto_non_numeric_score'))

        # Perform cumulative aggregations in one query
        aggregates = queryset\
            .annotate(
                has_grant=Exists(Grant.objects.filter(company__deal=OuterRef('pk'))),
                has_clinical_study=Exists(ClinicalStudy.objects.filter(company__deal=OuterRef('pk'))),
            )\
            .aggregate(
                deals_with_grant_count=Count('pk', filter=Q(has_grant=True)),
                deals_with_clinical_study_count=Count('pk', filter=Q(has_clinical_study=True)),
                today_count=Count('pk', filter=Q(created_at__date=tz_now.date())),
                yesterday_count=Count('pk', filter=Q(created_at__date=tz_now.date() - timedelta(days=1))),
                current_week_count=Count(
                    'pk',
                    filter=Q(created_at__year=tz_now.year, created_at__week=tz_now.isocalendar().week)
                ),
                previous_week_count=Count(
                    'pk',
                    filter=Q(created_at__year=_previous_week.year, created_at__week=_previous_week.week)
                ),
                current_month_count=Count(
                    'pk',
                    filter=Q(created_at__year=tz_now.year, created_at__month=tz_now.month)
                ),
                previous_month_count=Count('pk', filter=Q(created_at__range=_previous_month_dt_range)),
                current_year_count=Count(
                    'pk',
                    filter=Q(created_at__year=tz_now.year)
                )
            )

        return {
            'total_count': queryset.count(),
            'date_count_trend': list(date_count_trend),
            'funding_stage_count': list(funding_stage_count),
            'industry_count': list(industry_count),
            'du_signal_count': list(du_signal_count),
            'sent_to_affinity_count': list(sent_to_affinity_count),
            'state_count': list(state_count),
            'city_count': list(city_count),
            'quality_percentile_count': list(quality_percentile_count),
            'auto_non_numeric_score_count': list(auto_non_numeric_score_count),
            **aggregates
        }

    def get(self, request, *args, **kwargs):
        data = self.get_context_data()
        return JsonResponse(data)


class DealsDashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'deals/deals_dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Deals Dashboard')
        return context
