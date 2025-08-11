import json
from decimal import Decimal

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db.backends.postgresql.psycopg_any import NumericRange
from django.db.models import F
from django.db.models.functions import Lower
from django.utils.timezone import now

import numpy as np
import pandas as pd
from companies.models import (NUM_EMPLOYEES_RANGE_CHOICES, REVENUE_RANGE_CHOICES, FundingStage, FundingType,
                              InvestorType, IPOStatus)
from pandas.core.dtypes.common import is_string_dtype

from aindex.utils import get_country

from .models import Report


def prepare_company_df_from_cb_csv(input_file):
    """Return pandas dataframe of companies, in the structure suitable for ingesting into the database.

    Args:
        input_file (str, path object or file-like object):
            Path or file like object of the CSV file.

    Returns:
        pd.Dataframe
    """

    _date_columns = [
        'founded_on',
        'exit_on',
        'closed_on',
        'went_public_on',
        'delisted_on',
        'acquired_on',
        'last_layoff_date',
        'last_key_employee_change',
        'last_funding_date',
        'valuation_date'
    ]

    df = pd.read_csv(input_file, thousands='_')

    # standardize field names
    df.rename(
        columns={
            'Organization Name': 'name',
            'Description': 'summary',
            'Full Description': 'description',
            'Website': 'website',
            'Organization Name URL': 'cb_url',
            'LinkedIn': 'linkedin_url',
            'Facebook': 'facebook_url',
            'Twitter': 'twitter_url',
            'Contact Email': 'contact_email',
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
            'IT Spend (in USD)': 'it_spending_amount'
        },
        inplace=True,
        errors='ignore'
    )

    # parse date columns
    for column_name in _date_columns:
        if column_name in df:
            df[column_name] = pd.to_datetime(df[column_name], errors='raise')

    # year founded
    if 'year_founded' not in df and 'founded_on' in df:
        df['year_founded'] = df['founded_on'].dt.year

    # year evaluated
    if 'year_evaluated' not in df and 'last_funding_date' in df:
        df['year_evaluated'] = df['last_funding_date'].dt.year

    # location
    if 'hq_location' in df:
        df[['hq_city_name', 'hq_state_name', 'hq_country']] = (
            df.apply(_parse_hq_location, axis=1, result_type='expand')
        )

        df['hq_country'] = df['hq_country'].apply(_get_country_code)

    # diversity
    if 'diversity_spotlight' in df:
        df['has_women_on_founders'] = df['diversity_spotlight'].apply(_has_keywords, args=[['women']])
        df['has_black_on_founders'] = df['diversity_spotlight'].apply(_has_keywords, args=[['black']])
        df['has_hispanic_on_founders'] = (
            df['diversity_spotlight'].apply(_has_keywords, args=[['hispanic', 'latinx']])
        )
        df['has_asian_on_founders'] = df['diversity_spotlight'].apply(_has_keywords, args=[['asian']])
        df['has_meo_on_founders'] = (
            df['diversity_spotlight'].apply(_has_keywords,
                                            args=[['middle eastern', 'north african', 'native', 'indigenous']])
        )
        _diversity_columns = ['has_women_on_founders', 'has_black_on_founders',
                              'has_hispanic_on_founders', 'has_asian_on_founders', 'has_meo_on_founders']
        df['has_diversity_on_founders'] = df[_diversity_columns].any(axis='columns')

    # relation: funding stage/status
    if 'funding_stage' not in df and 'funding_stage_name' in df:
        funding_stages_df = pd.DataFrame(
            FundingStage.objects.values(
                funding_stage=F('id'),
                funding_stage_name=Lower('name')
            )
        )
        df['funding_stage_name'] = df['funding_stage_name'].str.lower()
        df = df.merge(funding_stages_df, how='left', on='funding_stage_name')

    # relation: last funding type
    if 'last_funding_type' not in df and 'last_funding_type_name' in df:
        funding_types_df = pd.DataFrame(
            FundingType.objects.values(
                last_funding_type=F('id'),
                last_funding_type_name=Lower('name')
            )
        )
        df['last_funding_type_name'] = df['last_funding_type_name'].str.lower()
        df = df.merge(funding_types_df, how='left', on='last_funding_type_name')

    # relation: last_equity_funding_type
    if 'last_equity_funding_type' not in df and 'last_equity_funding_type_name' in df:
        equity_funding_types_df = pd.DataFrame(
            FundingType.objects.values(
                last_equity_funding_type=F('id'),
                last_equity_funding_type_name=Lower('name')
            )
        )
        df['last_equity_funding_type_name'] = df['last_equity_funding_type_name'].str.lower()
        df = df.merge(equity_funding_types_df, how='left', on='last_equity_funding_type_name')

    # relation: ipo status
    if 'ipo_status' not in df and 'ipo_status_name' in df:
        ipo_status_df = pd.DataFrame(
            IPOStatus.objects.values(
                ipo_status=F('id'),
                ipo_status_name=Lower('name')
            )
        )
        df['ipo_status_name'] = df['ipo_status_name'].str.lower()
        df = df.merge(ipo_status_df, how='left', on='ipo_status_name')

    # relation: investor type
    if 'investor_types' not in df and 'investor_types_names' in df:
        investor_types_map = dict(InvestorType.objects.values_list(Lower('name'), 'id'))
        df['investor_types'] = df['investor_types_names'].apply(_map_csv_text, args=[investor_types_map])

    # relation: investment stages
    if 'investment_stages' not in df and 'investment_stages_names' in df:
        investment_stages_map = dict(FundingStage.objects.values_list(Lower('name'), 'id'))
        df['investment_stages'] = df['investment_stages_names'].apply(_map_csv_text, args=[investment_stages_map])

    # acquisitions
    if 'acquisition_tags' in df:
        df['was_acquired'] = df['acquisition_tags'].apply(_has_keywords, args=[['was acquired']])
        df['made_acquisitions'] = df['acquisition_tags'].apply(_has_keywords, args=[['made acquisitions']])

    # choice/options mappings
    company_type_choices = {
        'For Profit': 'for_profit',
        'Non-profit': 'non_profit'
    }

    operating_status_choices = {
        'Active': 'active',
        'Closed': 'closed'
    }

    acquisition_type_choices = {
        'Acquihire': 'acquihire',
        'Acquisition': 'acquisition',
        'Leveraged Buyout': 'lbo',
        'Management Buyout': 'management_buyout',
        'Merger': 'merge'
    }

    acquisition_terms_choices = {
        'Cash': 'cash',
        'Cash & Stock': 'cash_and_stock',
        'Stock': 'stock',
    }

    actively_hiring_choices = {
        'Yes': True,
        'No': False
    }

    num_employees_choices = {v: _int_range(k[0], k[1]) for k, v in NUM_EMPLOYEES_RANGE_CHOICES.items()}
    revenue_range_choices = {v: _decimal_range(k[0], k[1]) for k, v in REVENUE_RANGE_CHOICES.items()}

    df.replace({
        'company_type': company_type_choices,
        'operating_status': operating_status_choices,
        'acquisition_type': acquisition_type_choices,
        'acquisition_terms': acquisition_terms_choices,
        'revenue_range': revenue_range_choices,
        'valuation_range': revenue_range_choices,
        'num_employees_range': num_employees_choices,
        'actively_hiring': actively_hiring_choices
    }, inplace=True, regex=False)

    # percent signs cleanup
    _percent_sign_fields = [
        'web_monthly_visits_growth',
        'web_visit_duration_growth',
        'web_pages_per_visit_growth',
        'web_bounce_rate',
        'web_bounce_rate_growth',
        'web_monthly_traffic_rank_growth',
    ]
    for column_name in _percent_sign_fields:
        if column_name in df and is_string_dtype(df[column_name].dtype):
            df[column_name] = df[column_name].str.strip('%')

    # clean dates
    for column_name in _date_columns:
        if column_name in df:
            df[column_name] = df[column_name].dt.date

    # clean numeric fields
    for field_name in get_numeric_company_fields():
        if field_name in df and is_string_dtype(df[field_name].dtype):
            df[field_name] = df[field_name].str.replace(',', '')

    # clean text fields
    for field_name in get_text_company_fields():
        if field_name in df and is_string_dtype(df[field_name].dtype):
            df[field_name] = df[field_name].fillna('')
            df[field_name] = df[field_name].str.strip()

    # general cleanup
    df.replace({np.nan: None}, inplace=True)

    # add extras
    if 'extras' not in df:
        df['extras'] = df.apply(_add_extras, axis=1)

    return df


def get_numeric_company_fields():
    """Get list of company fields of numeric type."""
    field_types = (
        models.DecimalField,
        models.FloatField,
        models.IntegerField,
        models.PositiveIntegerField
    )

    return [field.name for field in Report._meta.get_fields() if isinstance(field, field_types)]


def get_text_company_fields():
    """Get list of company fields of text type."""
    field_types = (
        models.CharField,
        models.TextField,
        models.URLField,
        models.SlugField,
    )

    return [field.name for field in Report._meta.get_fields() if isinstance(field, field_types)]


def _parse_hq_location(values):
    """split HQ location value into city, state, and country"""
    try:
        city, state, country = values['hq_location'].split(',')
    except (ValueError, AttributeError):
        # no results if incorrect number of values to unpack
        return ['', '', '']

    return city.strip(), state.strip(), country.strip()


def _get_country_code(name):
    try:
        country = get_country(name)
    except LookupError:
        return ''

    if not country:
        return ''

    return country.alpha_2


def _has_keywords(text, keywords):
    """
    Check if text has any of the provided keywords.

    Args:
        text (str):
            checked string

        keywords (list or str):
            list of keywords

    Returns:
        bool
    """
    if isinstance(keywords, str):
        keywords = [keywords]

    for keyword in keywords:
        if keyword.lower() in str(text).lower():
            return True
    else:
        return False


def _map_csv_text(src, mapping):
    """Apply mapping on comma separated values"""

    if not src:
        return src

    src = str(src)
    results = []

    for item in src.split(','):
        item = item.strip().lower()
        try:
            results.append(str(mapping[item]))
        except KeyError:
            pass

    return ','.join(results)


def _add_extras(row):
    """Put additional information into extras"""
    known_fields = [f.name for f in Report._meta.get_fields()] + ['founders']

    cb_extras = {'_parse_date': now().date()}

    for k, v in row.items():
        if k not in known_fields:
            cb_extras[k] = v

    return json.dumps({'crunchbase': cb_extras}, cls=DjangoJSONEncoder)


def _str(value):
    """Cast value to string and if value is ``None`` return empty string """
    if value is None:
        return ''
    return str(value)


def _decimal_range(lower=None, upper=None, bounds='[)', empty=False):
    if lower is not None:
        lower = Decimal(float(lower))

    if upper is not None:
        upper = Decimal(float(upper))

    return NumericRange(lower, upper, bounds, empty=empty)


def _int_range(lower=None, upper=None, bounds='[)', empty=False):
    if lower is not None:
        lower = int(lower)

    if upper is not None:
        upper = int(upper)

    return NumericRange(lower, upper, bounds, empty=empty)
