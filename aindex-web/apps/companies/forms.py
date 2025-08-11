from django import forms

from .models import Grant, PatentApplication

__all__ = ['GrantForm', 'PatentApplicationForm', 'PatentApplicationBulkDeleteForm']


class ModelForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for field in self.Meta.required:
            self.fields[field].required = True


class GrantForm(ModelForm):

    class Meta:
        model = Grant
        exclude = ['company', 'extras']
        required = ['name', 'potential_amount']


class PatentApplicationForm(ModelForm):

    class Meta:
        model = PatentApplication
        exclude = ['company', 'extras']
        required = ['invention_title']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for field in self.Meta.required:
            self.fields[field].required = True


class PatentApplicationBulkDeleteForm(forms.Form):
    patent_applications = forms.ModelMultipleChoiceField(
        queryset=PatentApplication.objects.all(),
        widget=forms.CheckboxSelectMultiple,
    )
    confirmed = forms.BooleanField(widget=forms.HiddenInput, initial=True, required=False)

    def __init__(self, queryset=None, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if queryset is not None:
            self.fields['patent_applications'].queryset = queryset

    def save(self):
        if not self.cleaned_data.get('confirmed'):
            return

        patent_applications = self.cleaned_data['patent_applications']
        return PatentApplication.objects.filter(pk__in=[patent.pk for patent in patent_applications]).delete()
