from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView

from ..models import Company

__all__ = ['CompanyDetailView']


class CompanyDetailView(LoginRequiredMixin, DetailView):
    model = Company
    template_name = 'companies/company_detail.html'
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'

    def get_queryset(self):
        return super().get_queryset()\
            .select_related('ipo_status', 'technology_type', 'last_funding_type', 'funding_stage')\
            .prefetch_related('industries', 'patent_applications')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = self.object.name
        return context
