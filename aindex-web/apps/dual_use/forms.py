from abc import ABC, abstractmethod
from io import UnsupportedOperation

from django import forms
from django.core.exceptions import ValidationError
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import tablib
from companies.models import Industry
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Div, Fieldset, Layout
from django_countries.fields import CountryField

from .models import Report
from .utils import prepare_company_df_from_cb_csv

REPORT_SUMMARY_FIELDS = (
    'name', 'summary', 'description', 'website', 'hq_country',
    'hq_state_name', 'hq_city_name',
    'cb_url', 'linkedin_url', 'year_founded', 'year_evaluated', 'image',
)  # fmt: skip
REPORT_FINANCIALS_FIELDS = (
    'last_funding_type', 'last_funding_date', 'last_funding_amount',
    'funding_rounds_count', 'total_funding_amount', 'funding_stage',
    'acquirer_name', 'investors_names', 'accelerators_names', 'ipo_status',
)  # fmt: skip
REPORT_TECHNOLOGIES_FIELDS = (
    'technology_type', 'industries', 'cb_industries_names',
    'thesis_fit', 'thesis_fit_assessment', 'patents_granted_count',
)  # fmt: skip
REPORT_PEOPLE_FIELDS = (
    'founders_count', 'has_diversity_on_founders', 'has_women_on_founders',
    'has_black_on_founders', 'has_hispanic_on_founders', 'has_asian_on_founders',
    'has_meo_on_founders',
)  # fmt: skip


class GridFormHelper(ABC, FormHelper):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.form_tag = False
        self.form_class = 'row g-3'
        self.column_css_class = 'col-sm-6 d-flex mt-4'
        self.fieldset_css_class = 'details-container flex-grow-1'
        self.layout = self._create_form_layout()

    def _create_form_layout(self):
        fieldsets = self.form_fieldsets()
        fieldsets = (self._create_form_column(legend, fields) for legend, fields in fieldsets)
        layout = Layout(*fieldsets)
        return layout

    def _create_form_column(self, legend, fields, **kwargs):
        fieldset = Fieldset(legend, *fields, css_class=self.fieldset_css_class, **kwargs)
        column = Div(fieldset, css_class=self.column_css_class, **kwargs)
        return column

    @abstractmethod
    def form_fieldsets(self):
        pass


class ReportForm(forms.ModelForm):

    class Meta:
        model = Report
        fields = '__all__'


class ReportUpdateFormHelper(GridFormHelper):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def form_fieldsets(self):
        fieldsets = (
            (_('Summary'), REPORT_SUMMARY_FIELDS),
            (_('Financials'), REPORT_FINANCIALS_FIELDS),
            (_('Techologies'), REPORT_TECHNOLOGIES_FIELDS),
            (_('People'), REPORT_PEOPLE_FIELDS),
        )
        return fieldsets


class ReportUpdateForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = ReportUpdateFormHelper()

    class Meta:
        model = Report
        exclude = ['extras', 'creator', 'created_at', 'updated_at']
        fields = '__all__'
        widgets = {
            'summary': forms.Textarea(attrs={'rows': 3}),
            'description': forms.Textarea(attrs={'rows': 4}),
            'thesis_fit_assessment': forms.Textarea(attrs={'rows': 2}),
            'last_funding_date': forms.DateInput(attrs={'type': 'date', 'class': 'datepicker'}),
        }


class ReportCreateFormHelper(GridFormHelper):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def form_fieldsets(self):
        fieldsets = (
            (_('Background Information'), REPORT_SUMMARY_FIELDS),
            (_('Funding Information'), REPORT_FINANCIALS_FIELDS),
            (_('Company Industry'), REPORT_TECHNOLOGIES_FIELDS),
            (_('Diversity'), REPORT_PEOPLE_FIELDS),
        )
        return fieldsets


class ReportCreateForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super(ReportCreateForm, self).__init__(*args, **kwargs)
        self.helper = ReportCreateFormHelper()

    class Meta:
        model = Report
        exclude = ['extras', 'creator', 'created_at', 'updated_at']
        fields = '__all__'
        widgets = {
            'summary': forms.Textarea(attrs={'rows': 3}),
            'description': forms.Textarea(attrs={'rows': 4}),
            'thesis_fit_assessment': forms.Textarea(attrs={'rows': 2}),
            'last_funding_date': forms.DateInput(attrs={'type': 'date', 'class': 'datepicker'}),
        }


class ReportImportForm(forms.Form):
    file = forms.FileField(label=_('file to import'))

    def clean_file(self):
        import_file = self.cleaned_data['file']

        # Ensure it's a supported file format
        try:
            self.create_dataset(import_file)
        except (UnicodeError, ValueError, AttributeError, tablib.UnsupportedFormat, tablib.InvalidDimensions):
            raise ValidationError('Invalid file', code="invalid")

        return import_file

    def clean(self):
        super().clean()
        import_file = self.cleaned_data.get('file')
        if import_file:
            dataset = self.create_dataset(import_file)
            self.cleaned_data['dataset'] = dataset

    def create_dataset(self, import_file):
        try:
            import_file.file.seek(0)
        except (AttributeError,  UnsupportedOperation):
            pass

        df = prepare_company_df_from_cb_csv(import_file)

        return tablib.Dataset().load(df)


class DashboardFilterForm(forms.Form):
    YEAR_CHOICES = [
        (None, _('All years')),
        *reversed([(year, str(year)) for year in range(2000, now().year+1)])
    ]

    year_evaluated = forms.TypedChoiceField(
        label=_('year evaluated'),
        coerce=int,
        required=False,
        choices=YEAR_CHOICES,
        empty_value=None
    )

    industries = forms.ModelChoiceField(
        label=_('industry'),
        queryset=Industry.objects.all(),
        required=False,
        empty_label=_('All industries')
    )

    hq_country = CountryField(
        _('country'),
        blank=True,
        blank_label=_('All countries')
    ).formfield()

    thesis_fit = forms.NullBooleanField(
        label=_('thesis fit'),
        required=False,
        widget=forms.Select(
            choices=[
                (None, ''),
                (True, 'Yes'),
                (False, 'No'),
            ]
        )
    )

    def clean(self):
        self.cleaned_data = {k: v for k, v in self.cleaned_data.items() if v not in [None, '']}
