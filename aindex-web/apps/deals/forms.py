from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from companies.models import Company

from .models import Deal, Deck


class DeckForm(forms.ModelForm):

    class Meta:
        model = Deck
        fields = ['file']


class DealUpdateForm(forms.ModelForm):

    class Meta:
        model = Deal
        fields = [
            'company_name',
            'website',
            'state',
            'city',
            'stage',
            'funding_target',
            'funding_raised',
            'investors_names'
        ]

    def clean_website(self):
        website = self.cleaned_data.get('website')

        if self.instance and website and Company.objects.exclude(deal=self.instance).filter(website=website).exists():

            raise ValidationError(
                _(
                    "Another company with the website `%(website)s` is already existing in the database. "
                    "If the website is correct, it means there could be duplicate company records "
                    "therefore please report this to the administrator"
                ),
                code='duplicate',
                params={'website': website},
            )

        return website


class DealAssessmentForm(forms.ModelForm):

    send_to_affinity = forms.NullBooleanField(widget=forms.HiddenInput, required=False)

    class Meta:
        model = Deal
        fields = [
            'quality_percentile',
            'investment_rationale',
            'pros',
            'cons',
            'problem',
            'solution',
            'thesis_fit',
            'traction',
            'intellectual_property',
            'business_model',
            'market_sizing',
            'competition'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['investment_rationale'].widget.attrs.update({'rows': 3})
        self.fields['pros'].widget.attrs.update({'rows': 3})
        self.fields['cons'].widget.attrs.update({'rows': 3})

        for field_name in ['problem', 'solution', 'thesis_fit', 'traction',
                           'intellectual_property', 'business_model', 'market_sizing', 'competition']:
            self.fields[field_name].widget.attrs.update({'rows': 4})

    def clean(self):
        cleaned_data = super().clean()
        send_to_affinity = cleaned_data.get('send_to_affinity')

        if send_to_affinity is not None:
            for field_name in ['quality_percentile', 'investment_rationale', 'pros', 'cons']:
                if not cleaned_data.get(field_name):
                    self.add_error(field_name, _('required'))
