from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView
from django.views.generic.edit import DeleteView, FormMixin, UpdateView

from companies.models import Company

from .forms import FounderForm
from .models import Founder
from .tasks import pull_founder_data


class FounderCreateView(LoginRequiredMixin, FormMixin, DetailView):
    form_class = FounderForm
    model = Company
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'talents/founder_create.html'

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
            format_lazy('A founder ({founder_name}) was successfully added.', founder_name=form.instance.name)
        )
        pull_founder_data.delay(pk=form.instance.pk)
        return response

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        return self.object.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Add founder to %(name)s') % {'name': self.object.name}
        return context


class FounderUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Founder
    form_class = FounderForm
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'talents/founder_update.html'

    def form_valid(self, form):
        response = super().form_valid(form)
        pull_founder_data.delay(pk=self.object.pk)
        return response

    def get_success_message(self, cleaned_data):
        return format_lazy('Founder {founder_name} was successfully updated.', founder_name=self.object.name)

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url

        if not self.object.company:
            return reverse('home')

        return self.object.company.get_absolute_url()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _('Edit founder: %(name)s') % {'name': self.object.name}
        context['redirect_url'] = self.get_success_url()
        return context


class FounderDeleteView(LoginRequiredMixin, DeleteView):
    model = Founder
    slug_field = 'uuid'
    slug_url_kwarg = 'uuid'
    template_name = 'talents/founder_delete.html'

    def get_success_url(self):
        next_url = self.request.POST.get('next')
        if next_url:
            return next_url
        return self.object.company.get_absolute_url()

    def form_valid(self, form):
        founder_name = self.object.name

        response = super().form_valid(form)

        messages.success(
            self.request,
            format_lazy('Founder {founder_name} deleted.', founder_name=founder_name)
        )

        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = _("Delete '%(name)s'") % {'name': self.object.name}
        return context
