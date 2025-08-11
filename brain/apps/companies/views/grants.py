from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView, UpdateView
from django.views.generic.edit import DeleteView, FormMixin

from ..forms import GrantForm
from ..models import Company, Grant

__all__ = ['GrantCreateView', 'GrantUpdateView', 'GrantDeleteView']


class GrantCreateView(LoginRequiredMixin, FormMixin, DetailView):
    form_class = GrantForm
    model = Company
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'companies/grant_create.html'

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
            self.request, format_lazy('A grant ({grant_name}) was successfully added.', grant_name=form.instance.name)
        )
        return response

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url
        return self.object.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Add grant to %(name)s') % {'name': self.object.name}
        return context


class GrantUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Grant
    form_class = GrantForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'companies/grant_update.html'

    def get_success_message(self, cleaned_data):
        return format_lazy('Grant {grant_name} was successfully updated.', grant_name=self.object.name)

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        if not self.object.company:
            return reverse('home')

        return self.object.company.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Edit grant: %(name)s') % {'name': self.object.name}
        context['redirect_url'] = self.get_success_url()
        return context


class GrantDeleteView(LoginRequiredMixin, DeleteView):
    model = Grant
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'companies/grant_delete.html'

    def form_valid(self, form):
        object_name = self.object.name

        response = super().form_valid(form)

        messages.success(self.request, format_lazy('Grant: {grant_name} deleted.', grant_name=object_name))

        return response

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        if not self.object.company:
            return reverse('home')

        return self.object.company.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("Delete grant: %(name)s") % {'name': self.object.name}
        return context
