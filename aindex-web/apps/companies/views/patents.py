from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView, UpdateView
from django.views.generic.edit import DeleteView, FormMixin

from ..forms import PatentApplicationBulkDeleteForm, PatentApplicationForm
from ..models import Company, PatentApplication

__all__ = [
    'PatentApplicationCreateView',
    'PatentApplicationUpdateView',
    'PatentApplicationDeleteView',
    'PatentApplicationBulkDeleteView',
]


class PatentApplicationCreateView(LoginRequiredMixin, FormMixin, DetailView):
    form_class = PatentApplicationForm
    model = Company
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'companies/patent_application_create.html'

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = self.get_form()
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def form_valid(self, form):
        form.instance.company = self.object
        form.save()
        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy('A patent application ({title}) was successfully added.', title=form.instance.invention_title)
        )
        return response

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url
        return self.object.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Add patent application to %(name)s') % {'name': self.object.name}
        return context


class PatentApplicationUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = PatentApplication
    form_class = PatentApplicationForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    context_object_name = 'patent_application'
    template_name = 'companies/patent_application_update.html'

    def get_success_message(self, cleaned_data):
        return format_lazy('Patent Application {title} was successfully updated.',
                           title=self.object.invention_title)

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        if not self.object.company:
            return reverse('home')

        return self.object.company.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Edit patent application: %(name)s') % {'name': self.object.invention_title}
        context['redirect_url'] = self.get_success_url()
        return context


class PatentApplicationDeleteView(LoginRequiredMixin, DeleteView):
    model = PatentApplication
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    context_object_name = 'patent_application'
    template_name = 'companies/patent_application_delete.html'

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        if not self.object.company:
            return reverse('home')

        return self.object.company.get_absolute_url()

    def form_valid(self, form):
        title = self.object.invention_title

        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy(f'Patent Application: {title} deleted.', title=title)
        )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("Delete patent application: %(title)s") % {'title': self.object.invention_title}
        return context


class PatentApplicationBulkDeleteView(LoginRequiredMixin, FormMixin, DetailView):
    form_class = PatentApplicationBulkDeleteForm
    model = Company
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'companies/patent_application_bulk_delete.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['queryset'] = PatentApplication.objects.filter(company=self.object)
        return kwargs

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = self.get_form()
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        return reverse('home')

    def form_valid(self, form):
        if not form.cleaned_data['confirmed']:
            queryset = PatentApplication.objects.filter(
                pk__in=[patent.pk for patent in form.cleaned_data['patent_applications']]
            )
            form_kwargs = {
                **self.get_form_kwargs(),
                'queryset': queryset,
                'data': {'confirmed': True, 'patent_applications': queryset}
            }
            form_class = self.get_form_class()

            form = form_class(**form_kwargs)
            return self.render_to_response(self.get_context_data(form=form))

        deleted = form.save()
        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy('{count} patent application deleted.', count=deleted[1]['companies.PatentApplication'])
        )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("%(company)s: delete patent applications") % {'company': self.object.name}
        context['redirect_url'] = self.get_success_url()
        return context
