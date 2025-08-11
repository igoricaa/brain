from django import forms

from .models import Founder

__all__ = ['FounderForm']


class FounderForm(forms.ModelForm):

    class Meta:
        model = Founder
        exclude = ['company', 'extras']
