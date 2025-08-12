from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from ..models import Company

__all__ = ['CompanyDetailView']


class CompanyDetailView(LoginRequiredMixin, DetailView):
    model = Company
    template_name = 'companies/company_detail.html'
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related('ipo_status', 'technology_type', 'last_funding_type', 'funding_stage')
            .prefetch_related('industries', 'patent_applications', 'grants')
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = self.object.name
        request = self.request

        # Grants pagination
        g_all = request.GET.get('g_all') in ['1', 'true', 'True']
        try:
            g_size = int(request.GET.get('g_size') or 5)
        except (TypeError, ValueError):
            g_size = 5
        try:
            g_page = int(request.GET.get('g_page') or 1)
        except (TypeError, ValueError):
            g_page = 1

        grants_qs = self.object.grants.all().order_by('-award_year', '-award_month', '-created_at')
        if g_all:
            grants_page = None
            context['grants_list'] = list(grants_qs)
            context['grants_total'] = grants_qs.count()
        else:
            paginator = Paginator(grants_qs, g_size if g_size > 0 else 5)
            try:
                grants_page = paginator.page(g_page)
            except PageNotAnInteger:
                grants_page = paginator.page(1)
            except EmptyPage:
                grants_page = paginator.page(paginator.num_pages)
            context['grants_page'] = grants_page
            context['grants_total'] = paginator.count
            context['g_size'] = g_size

        # Patent applications pagination
        p_all = request.GET.get('p_all') in ['1', 'true', 'True']
        try:
            p_size = int(request.GET.get('p_size') or 5)
        except (TypeError, ValueError):
            p_size = 5
        try:
            p_page = int(request.GET.get('p_page') or 1)
        except (TypeError, ValueError):
            p_page = 1

        patents_qs = self.object.patent_applications.all().order_by('-filing_date', '-created_at')
        if p_all:
            patents_page = None
            context['patent_applications'] = list(patents_qs)
            context['patents_total'] = patents_qs.count()
        else:
            p_paginator = Paginator(patents_qs, p_size if p_size > 0 else 5)
            try:
                patents_page = p_paginator.page(p_page)
            except PageNotAnInteger:
                patents_page = p_paginator.page(1)
            except EmptyPage:
                patents_page = p_paginator.page(p_paginator.num_pages)
            context['patents_page'] = patents_page
            # Also provide list for include
            context['patent_applications'] = list(patents_page.object_list)
            context['patents_total'] = p_paginator.count
            context['p_size'] = p_size

        return context
