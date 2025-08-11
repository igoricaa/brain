import json

from django.db import models
from django.db.models.functions import Lower
from django.utils.functional import cached_property

from import_export import resources

from aindex.utils import get_country

from common.utils import as_decimal_range, as_int_range
from companies.models import (
    NUM_EMPLOYEES_RANGE_CHOICES,
    REVENUE_RANGE_CHOICES,
    FundingStage,
    FundingType,
    InvestorType,
    IPOStatus,
)

from .models import MissedDeal


class MissedDealResource(resources.ModelResource):

    rename_fields = {
        'Organization Name': 'name',
        'Description': 'summary',
        'Full Description': 'description',
        'Website': 'website',
        'Organization Name URL': 'cb_url',
        'LinkedIn': 'linkedin_url',
        'Facebook': 'facebook_url',
        'Twitter': 'twitter_url',
        'Contact Email': 'email',
        'Phone Number': 'phone_number',
        'Headquarters Location': 'hq_location',
        'Headquarters Regions': 'hq_regions_names',
        'Founded Date': 'founded_on',
        'Founded Date Precision': 'founded_on_precision',
        'Postal Code': 'hq_postal_code',
        'Company Type': 'company_type',
        'Operating Status': 'operating_status',
        'Number of Sub-Orgs': 'num_sub_organizations',
        'Estimated Revenue Range': 'revenue_range',
        'Exit Date': 'exit_on',
        'Exit Date Precision': 'exit_on_precision',
        'Closed Date': 'closed_on',
        'Closed Date Precision': 'closed_on_precision',
        'Industries': 'cb_industries_names',
        'Industry Groups': 'cb_industries_groups',
        'IPO Status': 'ipo_status_name',
        'Money Raised at IPO (in USD)': 'ipo_money_raised',
        'Valuation at IPO (in USD)': 'ipo_valuation',
        'IPO Date': 'went_public_on',
        'Delisted Date': 'delisted_on',
        'Delisted Date Precision': 'delisted_on_precision',
        'Stock Symbol': 'stock_symbol',
        'Stock Symbol URL': 'stock_cb_url',
        'Stock Exchange': 'stock_exchange_symbol',
        'Patents Granted': 'patents_granted_count',
        'Trademarks Registered': 'trademarks_count',
        'Most Popular Patent Class': 'popular_patent_class',
        'Most Popular Trademark Class': 'popular_trademark_class',
        'Number of Founders': 'founders_count',
        'Founders': 'founders',
        'Number of Employees': 'num_employees_range',
        'Actively Hiring': 'actively_hiring',
        'Last Layoff Mention Date': 'last_layoff_date',
        'Last Leadership Hiring Date': 'last_key_employee_change',
        'Diversity Spotlight': 'diversity_spotlight',
        'Number of Funding Rounds': 'funding_rounds_count',
        'Funding Status': 'funding_stage_name',
        'Last Funding Date': 'last_funding_date',
        'Last Funding Type': 'last_funding_type_name',
        'Last Funding Amount (in USD)': 'last_funding_amount',
        'Total Funding Amount (in USD)': 'total_funding_amount',
        'Last Equity Funding Type': 'last_equity_funding_type_name',
        'Last Equity Funding Amount (in USD)': 'last_equity_funding_amount',
        'Total Equity Funding Amount (in USD)': 'total_equity_funding_amount',
        'Top 5 Investors': 'investors_names',
        'Number of Lead Investors': 'num_lead_investors',
        'Number of Investors': 'num_investors',
        'Announced Date': 'acquired_on',
        'Announced Date Precision': 'acquired_on_precision',
        'Transaction Name': 'acquisition_name',
        'Transaction Name URL': 'acquisition_cb_url',
        'Acquired by': 'acquirer_name',
        'Acquired by URL': 'acquirer_cb_url',
        'Price (in USD)': 'acquisition_price',
        'Acquisition Type': 'acquisition_type',
        'Acquisition Terms': 'acquisition_terms',
        'Number of Acquisitions': 'num_acquisitions',
        'Acquisition Status': 'acquisition_tags',
        'Most Recent Valuation Range': 'valuation_range',
        'Date of Most Recent Valuation': 'valuation_date',
        'Investor Type': 'investor_types_names',
        'Investment Stage': 'investment_stages_names',
        'CB Rank (Company)': 'cb_rank',
        'Trend Score (7 Days)': 'cb_rank_delta_d7',
        'Trend Score (30 Days)': 'cb_rank_delta_d30',
        'Trend Score (90 Days)': 'cb_rank_delta_d90',
        'Similar Companies': 'cb_num_similar_companies',
        'Hub Tags': 'cb_hub_tags',
        'Growth Category': 'cb_growth_category',
        'Growth Confidence': 'cb_growth_confidence',
        'Number of Articles': 'cb_num_articles',
        'Number of Events': 'cb_num_events_appearances',
        'Monthly Visits': 'web_monthly_visits',
        'Average Visits (6 months)': 'web_avg_visits_m6',
        'Monthly Visits Growth': 'web_monthly_visits_growth',
        'Visit Duration': 'web_visit_duration',
        'Visit Duration Growth': 'web_visit_duration_growth',
        'Page Views / Visit': 'web_pages_per_visit',
        'Page Views / Visit Growth': 'web_pages_per_visit_growth',
        'Bounce Rate': 'web_bounce_rate',
        'Bounce Rate Growth': 'web_bounce_rate_growth',
        'Global Traffic Rank': 'web_traffic_rank',
        'Monthly Rank Change (#)': 'web_monthly_traffic_rank_change',
        'Monthly Rank Growth': 'web_monthly_traffic_rank_growth',
        'Active Tech Count': 'web_tech_count',
        'Number of Apps': 'apps_count',
        'Downloads Last 30 Days': 'apps_downloads_count_d30',
        'Total Products Active': 'tech_stack_product_count',
        'IT Spend (in USD)': 'it_spending_amount',
    }

    percent_fields = [
        'web_monthly_visits_growth',
        'web_visit_duration_growth',
        'web_pages_per_visit_growth',
        'web_bounce_rate',
        'web_bounce_rate_growth',
        'web_monthly_traffic_rank_growth',
    ]

    values_mapping = {
        'company_type': {'For Profit': 'for_profit', 'Non-profit': 'non_profit'},
        'operating_status': {'Active': 'active', 'Closed': 'closed'},
        'acquisition_type': {
            'Acquihire': 'acquihire',
            'Acquisition': 'acquisition',
            'Leveraged Buyout': 'lbo',
            'Management Buyout': 'management_buyout',
            'Merger': 'merge',
        },
        'acquisition_terms': {
            'Cash': 'cash',
            'Cash & Stock': 'cash_and_stock',
            'Stock': 'stock',
        },
        'actively_hiring': {'Yes': True, 'No': False},
        'num_employees_range': {
            '': None,
            **{v: as_int_range(k[0], k[1]) for k, v in NUM_EMPLOYEES_RANGE_CHOICES.items()},
        },
        'revenue_range': {'': None, **{v: as_decimal_range(k[0], k[1]) for k, v in REVENUE_RANGE_CHOICES.items()}},
        'valuation_range': {'': None, **{v: as_decimal_range(k[0], k[1]) for k, v in REVENUE_RANGE_CHOICES.items()}},
    }

    #: foreign keys mappings
    fk_mapping = {
        'funding_stage': {
            'model': FundingStage,
            'lookup_key': 'name',
            'lookup_value': 'funding_stage_name',
            'ignore_case': True,
        },
        'last_funding_type': {
            'model': FundingType,
            'lookup_key': 'name',
            'lookup_value': 'last_funding_type_name',
            'ignore_case': True,
        },
        'last_equity_funding_type': {
            'model': FundingType,
            'lookup_key': 'name',
            'lookup_value': 'last_equity_funding_type_name',
            'ignore_case': True,
        },
        'ipo_status': {
            'model': IPOStatus,
            'lookup_key': 'name',
            'lookup_value': 'ipo_status_name',
            'ignore_case': True,
        },
    }

    #: ManyToMany relation mappings
    m2m_mapping = {
        'investor_types': {
            'model': InvestorType,
            'lookup_key': 'name',
            'lookup_value': 'investor_types_names',
            'ignore_case': True,
        },
        'investment_stages': {
            'model': FundingStage,
            'lookup_key': 'name',
            'lookup_value': 'investment_stages_names',
            'ignore_case': True,
        },
    }

    class Meta:
        model = MissedDeal
        clean_model_instances = True
        store_instance = True

    def __init__(self, user=None, **kwargs):
        super().__init__(**kwargs)
        self.user = user

    @property
    def numeric_fields(self):
        """list of fields of numeric type."""
        numeric_types = (models.DecimalField, models.FloatField, models.IntegerField, models.PositiveIntegerField)

        return [field.name for field in self._meta.model._meta.get_fields() if isinstance(field, numeric_types)]

    @property
    def text_fields(self):
        """List of fields of text type."""
        text_types = (
            models.CharField,
            models.TextField,
            models.URLField,
            models.SlugField,
        )

        return [field.name for field in self._meta.model._meta.get_fields() if isinstance(field, text_types)]

    @cached_property
    def fk_mapping_values(self):
        return self._get_relation_mapping_values(self.fk_mapping)

    @cached_property
    def m2m_mapping_values(self):
        return self._get_relation_mapping_values(self.m2m_mapping)

    @classmethod
    def _get_relation_mapping_values(cls, mapping):
        values = {}

        for field_name, relation in mapping.items():
            if relation['ignore_case']:
                field_values = relation['model'].objects.values_list(Lower(relation['lookup_key']), 'pk')
            else:
                field_values = relation['model'].objects.values_list(relation['lookup_key'], 'pk')

            values[field_name] = dict(field_values)

        return values

    def preprocess_row(self, row):

        # rename fields
        for src_name, field_name in self.rename_fields.items():
            if src_name in row and field_name not in row:
                row[field_name] = row.pop(src_name)

        # clean numeric fields
        for field_name in self.numeric_fields:
            if field_name in row and isinstance(row[field_name], str):
                row[field_name] = row[field_name].replace(',', '').strip()

        # clean text fields
        for field_name in self.text_fields:
            if field_name in row and isinstance(row[field_name], str):
                row[field_name] = row[field_name].strip()

        # clean percent fields
        for field_name in self.percent_fields:
            if field_name in row and isinstance(row[field_name], str):
                row[field_name] = row[field_name].strip('%')

        # map values
        for field_name, mapping in self.values_mapping.items():
            if field_name in row:
                value = row[field_name]
                row[field_name] = mapping.get(value, value)

        # map foreign keys
        for field_name, fk in self.fk_mapping.items():

            column_name = fk['lookup_value']
            ignore_case = fk.get('ignore_case')

            if field_name in row or column_name not in row:
                continue

            if ignore_case:
                og_value = row[column_name].lower()
            else:
                og_value = row[column_name]

            row[field_name] = self.fk_mapping_values[field_name].get(og_value, None)

        # map many to many relations
        for field_name, relation in self.m2m_mapping.items():

            column_name = relation['lookup_value']
            ignore_case = relation.get('ignore_case')
            separator = relation.get('separator', ',')

            if field_name in row or column_name not in row:
                continue

            if ignore_case:
                og_value = row[column_name].lower()
            else:
                og_value = row[column_name]

            if isinstance(og_value, str):
                og_value = [value.strip() for value in og_value.split(separator)]

            values = []
            for value in og_value:
                ref_key = self.m2m_mapping_values[field_name].get(value)
                if ref_key:
                    values.append(ref_key)

            row[field_name] = ','.join([str(v) for v in values])

    def parse_acquisition_tags(self, row):
        if 'acquisition_tags' not in row:
            return

        if 'was_acquired' not in row:
            row['was_acquired'] = 'was acquired' in row['acquisition_tags'].lower()

        if 'made_acquisitions' not in row:
            row['made_acquisitions'] = 'made acquisitions' in row['acquisition_tags'].lower()

    def parse_diversity_spotlight(self, row):
        diversity_spotlight = row.get('diversity_spotlight').lower()
        row['has_women_on_founders'] = 'women' in diversity_spotlight
        row['has_black_on_founders'] = 'black' in diversity_spotlight
        row['has_hispanic_on_founders'] = any(x in diversity_spotlight for x in ['hispanic', 'latinx'])
        row['has_asian_on_founders'] = 'asian' in diversity_spotlight
        row['has_meo_on_founders'] = any(
            x in diversity_spotlight for x in ['middle eastern', 'north african', 'native', 'indigenous']
        )

        _diversity_columns = [
            'has_women_on_founders',
            'has_black_on_founders',
            'has_hispanic_on_founders',
            'has_asian_on_founders',
            'has_meo_on_founders',
        ]
        row['has_diversity_on_founders'] = any(row[diversity] for diversity in _diversity_columns)

    def parse_location(self, row):
        if 'hq_location' in row:
            try:
                city, state, country = row['hq_location'].split(',')
            except (ValueError, AttributeError):
                # do nothing if incorrect number of values to unpack
                return

            try:
                row['hq_country'] = get_country(country).alpha_2
            except LookupError:
                pass

            row['hq_state_name'] = state
            row['hq_city_name'] = city

    def parse_extras(self, row):

        known_fields = [f.name for f in self._meta.model._meta.get_fields()] + list(self.m2m_mapping.keys())

        if 'extras' in row:
            extras = row['extras']
            if isinstance(extras, str):
                extras = json.loads(extras)
        else:
            extras = {}

        for k, v in row.items():
            if k not in known_fields:
                extras[k] = v

        row['extras'] = json.dumps(extras)

    def before_import_row(self, row, **kwargs):
        self.preprocess_row(row)
        self.parse_acquisition_tags(row)
        self.parse_diversity_spotlight(row)
        self.parse_location(row)
        self.parse_extras(row)
