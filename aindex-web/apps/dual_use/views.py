from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.db.models import Count, F, Func, IntegerField, Sum
from django.db.models.functions import Cast
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse, reverse_lazy
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _
from django.views import View
from django.views.generic import CreateView, DeleteView, DetailView, FormView, TemplateView, UpdateView
from django.views.generic.detail import SingleObjectMixin

from django_filters.views import FilterView
from el_pagination.views import AjaxListView
from import_export.results import RowResult
from talents.models import Founder

from aindex.utils import get_country

from .filters import ReportListFilter
from .forms import DashboardFilterForm, ReportCreateForm, ReportImportForm, ReportUpdateForm
from .import_export import ImportMixin, ReportResource
from .models import Report


class ReportListView(LoginRequiredMixin, FilterView, AjaxListView):
    model = Report
    template_name = 'dual_use/report_list.html'
    page_template = 'dual_use/includes/report_list.html'
    filterset_class = ReportListFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(is_reviewed=True).prefetch_related('industries').order_by('-updated_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Companies')
        return context


class UnreviewedReportListView(LoginRequiredMixin, FilterView, AjaxListView):
    model = Report
    template_name = 'dual_use/unreviewed_report_list.html'
    page_template = 'dual_use/includes/unreviewed_report_list.html'
    filterset_class = ReportListFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.exclude(is_reviewed=True).prefetch_related('industries').order_by('-updated_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Unreviewed companies')
        return context


class ReportReviewView(LoginRequiredMixin, SingleObjectMixin, View):
    model = Report
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_queryset(self):
        return self.model.objects.filter(is_reviewed=False)

    def post(self, request, *args, **kwargs):

        self.object = self.get_object()
        self.object.is_reviewed = True
        try:
            self.object.extras['reviewer'] = {'username': request.user.username}
        except (AttributeError, TypeError):
            pass
        self.object.save(update_fields=['is_reviewed', 'updated_at', 'extras'])

        messages.success(
            request,
            format_lazy('{report_name} was successfully reviewed.', company_name=self.object.name)
        )

        return HttpResponseRedirect(self.object.get_absolute_url())


class ReportDetailView(LoginRequiredMixin, DetailView):
    model = Report
    template_name = 'dual_use/report_detail.html'
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_queryset(self):
        return super().get_queryset()\
            .select_related('company', 'ipo_status', 'technology_type', 'last_funding_type', 'funding_stage')\
            .prefetch_related('industries', 'company__founders', 'company__grants')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = self.object.name

        company = self.object.company
        if company:
            context['company'] = company
            context['founders'] = company.founders.all()
            context['grants'] = company.grants.order_by('-award_year')
        else:
            context['company'] = None
            context['founders'] = []
            context['grants'] = []
        return context


class ReportCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Report
    form_class = ReportCreateForm
    template_name = 'dual_use/report_create.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Add Company')
        return context

    def form_valid(self, form):
        user = self.request.user

        form.instance.creator = user
        return super().form_valid(form)

    def get_success_message(self, cleaned_data):
        company_name = self.object.name
        return format_lazy('Company {company_name} was successfully saved.', company_name=company_name)


class ReportUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Report
    form_class = ReportUpdateForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'dual_use/report_update.html'

    def get_success_message(self, cleaned_data):
        company_name = self.object.name
        return format_lazy('Company {company_name} was successfully updated.', company_name=company_name)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Edit company: %(name)s') % {'name': self.object.name}
        return context


class ReportDeleteView(LoginRequiredMixin, DeleteView):
    model = Report
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'dual_use/report_delete.html'

    def get_success_url(self):
        return reverse('dual-use:report-list')

    def form_valid(self, form):
        company_name = self.object.name

        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy('{company_name} company deleted.', company_name=company_name)
        )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("Delete '%(name)s'") % {'name': self.object.name}
        return context


class ReportImportView(LoginRequiredMixin, ImportMixin, FormView):
    """Import companies from an uploaded CSV file.

    Currently, the expected data is expected to be similar to Crunchbase CSV export.
    """
    form_class = ReportImportForm
    resource_class = ReportResource
    success_url = reverse_lazy('dual-use:report-list')
    template_name = 'dual_use/report_import.html'

    def form_valid(self, form):
        dataset = form.cleaned_data['dataset']
        result = self.process_dataset(dataset)

        if result.has_errors() or result.has_validation_errors():
            return self.form_invalid(form, result=result)

        self.add_success_message(result)
        return super().form_valid(form)

    def form_invalid(self, form, result=None):
        """If the form is invalid, add import result to the context and render the invalid form."""
        return self.render_to_response(self.get_context_data(form=form, result=result))

    def get_resource_kwargs(self, **kwargs):
        kwargs['user'] = self.request.user
        return kwargs

    def process_dataset(self, dataset, **kwargs):
        resource = self.get_resource()
        result = resource.import_data(dataset, dry_run=False, **kwargs)
        return result

    def add_success_message(self, result):
        success_message = _(
            "Import finished: {} new, {} updated, {} deleted and {} skipped companies."
        ).format(
            result.totals[RowResult.IMPORT_TYPE_NEW],
            result.totals[RowResult.IMPORT_TYPE_UPDATE],
            result.totals[RowResult.IMPORT_TYPE_DELETE],
            result.totals[RowResult.IMPORT_TYPE_SKIP],
        )

        messages.success(self.request, success_message)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Import Companies')
        return context


class SummaryDataView(LoginRequiredMixin, View):
    """Dual use report data view"""

    def get_report_filter_kwargs(self):
        """Return a dict of arguments for filtering the main companies queryset"""
        filter_form = DashboardFilterForm(self.request.GET)
        if not filter_form.is_valid():
            return JsonResponse({'details': 'invalid filtering parameters'}, status=400)
        return filter_form.cleaned_data

    def get_base_report_queryset(self):
        queryset = Report.objects.filter(is_reviewed=True)
        return queryset

    def get_report_queryset(self):
        """Returns the main queryset of companies"""
        filter_kwargs = self.get_report_filter_kwargs()
        queryset = self.get_base_report_queryset().filter(**filter_kwargs)
        return queryset

    def get_report_count_by_group(self, *args):
        """Aggregates the number of companies matching the main queryset per specified field

        Args:
            args (str):
                Field names or expressions used for qrouping the companies when counting

        Returns:
            Values Queryset
        """
        return self.get_report_queryset().values(*args).annotate(count=Count('*'))

    def get_base_report_count_by_group(self, *args, **kwargs):
        """Aggregates the number of companies per specified field

        Args:
            args (str):
                Field names or expressions used for qrouping the companies when counting

            kwargs (dict):
                keyword arguments used to filter the companies queryset.

        Returns:
            Values Queryset
        """
        queryset = self.get_base_report_queryset().filter(**kwargs)
        return queryset.values(*args).annotate(count=Count('*'))

    def get_report_count_by_investor(self):
        """Yields a values of investor names and number of companies they invested in, by year evaluated"""
        top_investors = self.get_report_queryset()\
            .values(investor_name=Func(F('investors_names'), function='unnest'))\
            .annotate(count=Count('*'))\
            .filter(count__gte=3)\
            .values_list('investor_name', flat=True)

        queryset = self.get_base_report_queryset()\
            .values('year_evaluated', investor_name=Func(F('investors_names'), function='unnest'))\
            .annotate(count=Count('*'))\
            .order_by('-count', '-year_evaluated')

        # TODO: Filtering from the database side.
        # By default set-returning functions are not allowed in WHERE
        # https://forum.djangoproject.com/t/django-4-2-behavior-change-when-using-arrayagg-on-unnested-arrayfield-postgresql-specific/21547
        for values in queryset:
            if values['investor_name'] in top_investors:
                yield values

    def get_report_count_by_accelerator(self):
        """Yields values of accelerator names and number of companies they are involved with, by year evaluated"""
        top_accelerators = self.get_report_queryset()\
            .values(accelerator_name=Func(F('accelerators_names'), function='unnest'))\
            .annotate(count=Count('*'))\
            .filter(count__gte=3)\
            .values_list('accelerator_name', flat=True)

        queryset = self.get_base_report_queryset()\
            .values('year_evaluated', accelerator_name=Func(F('accelerators_names'), function='unnest'))\
            .annotate(count=Count('*'))\
            .order_by('-count', '-year_evaluated')

        # TODO: Filtering from the database side.
        # By default set-returning functions are not allowed in WHERE
        # https://forum.djangoproject.com/t/django-4-2-behavior-change-when-using-arrayagg-on-unnested-arrayfield-postgresql-specific/21547
        for values in queryset:
            if values['accelerator_name'] in top_accelerators:
                yield values

    def get_founders_queryset(self):
        """Returns the queryset of founders based on companies main queryset"""
        filter_kwargs = {
            f'company__du_report__{field}': value
            for field, value in self.get_report_filter_kwargs().items()
        }
        filter_kwargs['company__du_report__is_reviewed'] = True
        queryset = Founder.objects.filter(**filter_kwargs)
        return queryset

    def get_founders_count_by_group(self, *args):
        """Aggregates the number of founders matching the main company queryset per specified field

        Args:
            args (str):
                Field names or expressions used for qrouping the founders when counting

        Returns:
            Values Queryset
        """
        queryset = self.get_founders_queryset()
        return queryset.values(*args).annotate(count=Count('*'))

    def get_founders_count_by_past_employment(self):
        """Returns a values queryset of past employers names and number founders they were involved with."""
        queryset = self.get_founders_queryset()
        return queryset\
            .values(year_evaluated=F('company__du_report__year_evaluated'),
                    employment=Func(F('past_significant_employment'), function='unnest'),)\
            .annotate(count=Count('*'))

    def get_founders_count_by_gom_bg(self):
        """Returns a values queryset of government or military agencies names and number founders they were
        involved with.
        """
        queryset = self.get_founders_queryset()
        return queryset\
            .values(year_evaluated=F('company__du_report__year_evaluated'),
                    employment=Func(F('military_or_govt_background'), function='unnest'),)\
            .annotate(count=Count('*'))

    def get_report_count_trend_by_diversity(self):
        """Returns a values queryset number of companies meeting various diversity criteria per year of evaluation"""
        queryset = self.get_report_queryset()
        return queryset\
            .filter(year_evaluated__isnull=False)\
            .values('year_evaluated')\
            .annotate(
                has_diversity_on_founders=Sum(Cast('has_diversity_on_founders', IntegerField()), default=0),
                has_women_on_founders=Sum(Cast('has_women_on_founders', IntegerField()), default=0),
                has_black_on_founders=Sum(Cast('has_black_on_founders', IntegerField()), default=0),
                has_hispanic_on_founders=Sum(Cast('has_hispanic_on_founders', IntegerField()), default=0),
                has_asian_on_founders=Sum(Cast('has_asian_on_founders', IntegerField()), default=0),
                has_meo_on_founders=Sum(Cast('has_meo_on_founders', IntegerField()), default=0),
            )

    def get_context_data(self):
        hq_country_report_count = []
        for record in self.get_report_count_by_group('hq_country').order_by('-count'):
            try:
                country = get_country(record['hq_country'])
                if country:
                    country_name = country.name
                else:
                    country_name = record['hq_country']
            except LookupError:
                country_name = record['hq_country']

            hq_country_report_count.append({
                'hq_country_name': country_name,
                'count': record['count']
            })

        hq_state_report_count = list(self.get_report_count_by_group('hq_state_name').order_by('-count'))
        hq_city_report_count = list(self.get_report_count_by_group('hq_city_name').order_by('-count'))
        technology_type_report_count_trend = list(
            self.get_base_report_count_by_group('technology_type__name', 'year_evaluated').order_by('year_evaluated')
        )
        industry_report_count_trend = list(
            self.get_base_report_count_by_group('industries__name', 'year_evaluated')
                .order_by('-count', 'year_evaluated')
        )
        year_founded_report_count_trend = list(self.get_base_report_count_by_group('year_founded', 'year_evaluated'))
        investors_report_count_trend = list(self.get_report_count_by_investor())
        accelerators_report_count_trend = list(self.get_report_count_by_accelerator())
        founders_count_report_count_trend = list(
            self.get_base_report_count_by_group('founders_count', 'year_evaluated')
        )
        founders_bachelor_school_count = list(self.get_founders_count_by_group('bachelor_school'))
        founders_graduate_school_count = list(self.get_founders_count_by_group('graduate_school'))
        founders_graduate_degree_type_count = list(self.get_founders_count_by_group('graduate_degree_type'))
        founders_past_employment_count_trend = list(self.get_founders_count_by_past_employment())
        founders_mog_bg_count_trend = list(self.get_founders_count_by_gom_bg())
        founders_diversity_report_count_trend = list(
            self.get_report_count_trend_by_diversity().order_by('year_evaluated')
        )

        return {
            'hq_country_report_count': hq_country_report_count,
            'hq_state_report_count': hq_state_report_count,
            'hq_city_report_count': hq_city_report_count,
            'technology_type_report_count_trend': technology_type_report_count_trend,
            'industry_report_count_trend': industry_report_count_trend,
            'year_founded_report_count_trend': year_founded_report_count_trend,
            'founders_count_report_count_trend': founders_count_report_count_trend,
            'founders_bachelor_school_count': founders_bachelor_school_count,
            'founders_graduate_school_count': founders_graduate_school_count,
            'founders_graduate_degree_type_count': founders_graduate_degree_type_count,
            'investors_report_count_trend': investors_report_count_trend,
            'accelerators_report_count_trend': accelerators_report_count_trend,
            'founders_past_employment_count_trend': founders_past_employment_count_trend,
            'founders_mog_bg_count_trend': founders_mog_bg_count_trend,
            'founders_diversity_report_count_trend': founders_diversity_report_count_trend,
        }

    def get(self, request, *args, **kwargs):
        data = self.get_context_data()
        return JsonResponse(data)


class DashboardView(LoginRequiredMixin, TemplateView):
    model = Report
    template_name = 'dual_use/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Dual-use Dashboard')
        context['filter_form'] = DashboardFilterForm(self.request.GET)
        return context
