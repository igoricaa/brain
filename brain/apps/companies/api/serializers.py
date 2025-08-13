from django.contrib.postgres import fields as postgres_fields
from django.db import transaction

from django_countries.serializer_fields import CountryField
from drf_extra_fields.fields import DecimalRangeField, IntegerRangeField
from rest_framework import serializers

from ..models import (
    Advisor,
    ClinicalStudy,
    Company,
    CompanyAdvisor,
    Founder,
    Founding,
    FundingStage,
    FundingType,
    Grant,
    Industry,
    InvestorType,
    IPOStatus,
    PatentApplication,
    TechnologyType,
)

__all__ = [
    'RelatedTechnologyTypeSerializer',
    'RelatedIndustrySerializer',
    'RelatedFundingTypeSerializer',
    'RelatedFundingStageSerializer',
    'RelatedIPOStatusSerializer',
    'RelatedInvestorTypeSerializer',
    'RelatedCompanyFounderSerializer',
    'RelatedFounderCompanySerializer',
    'RelatedAdvisorCompanySerializer',
    'RelatedAdvisorCompanySerializer',
    'RelatedCompanySerializer',
    'CompanyCreateSerializer',
    'CompanyListSerializer',
    'FounderSerializer',
    'AdvisorSerializer',
    'GrantSerializer',
    'ClinicalStudySerializer',
    'PatentApplicationSerializer',
    'IPOStatusSerializer',
    'InvestorTypeSerializer',
    'FundingTypeSerializer',
    'FundingStageSerializer',
    'TechnologyTypeSerializer',
    'IndustrySerializer',
]


class ModelSerializer(serializers.ModelSerializer):

    serializer_field_mapping = {
        **serializers.ModelSerializer.serializer_field_mapping,
        postgres_fields.IntegerRangeField: IntegerRangeField,
        postgres_fields.DecimalRangeField: DecimalRangeField,
    }


class RelatedTechnologyTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = TechnologyType
        fields = ['uuid', 'code', 'name']


class RelatedIndustrySerializer(serializers.ModelSerializer):

    class Meta:
        model = Industry
        fields = ['uuid', 'code', 'name']


class RelatedFundingTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingType
        fields = ['uuid', 'code', 'name']


class RelatedFundingStageSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingStage
        fields = ['uuid', 'code', 'name']


class RelatedIPOStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = IPOStatus
        fields = ['uuid', 'code', 'name']


class RelatedInvestorTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = InvestorType
        fields = ['uuid', 'code', 'name']


class RelatedCompanyFounderSerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(source='founder_uuid')
    name = serializers.URLField(source='founder_name')
    linkedin_url = serializers.URLField(source='founder_linkedin_url')

    class Meta:
        model = Founding
        fields = ['uuid', 'name', 'title', 'linkedin_url']


class RelatedCompanyAdvisorSerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(source='advisor.uuid')
    name = serializers.CharField(source='advisor.name')
    linkedin_url = serializers.URLField(source='advisor.linkedin_url')

    class Meta:
        model = CompanyAdvisor
        fields = ['uuid', 'name', 'linkedin_url']


class RelatedFounderCompanySerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(source='company_uuid')
    name = serializers.URLField(source='company_name')
    image = serializers.URLField(source='company_image')
    website = serializers.URLField(source='company_website')

    class Meta:
        model = Founding
        fields = ['uuid', 'name', 'title', 'website', 'image']


class RelatedAdvisorCompanySerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(source='company.uuid')
    name = serializers.CharField(source='company.name')
    image = serializers.SerializerMethodField()
    website = serializers.URLField(source='company.website')

    class Meta:
        model = CompanyAdvisor
        fields = ['uuid', 'name', 'image', 'website']

    def get_image(self, obj):
        if obj.company and obj.company.image:
            return obj.company.image.url
        return None


class RelatedCompanySerializer(serializers.ModelSerializer):
    """A serializer for company relations."""

    class Meta:
        model = Company
        fields = ['uuid', 'name', 'website', 'image']


class CompanyListSerializer(ModelSerializer):

    hq_country = CountryField()
    founders = RelatedCompanyFounderSerializer(source='foundings', read_only=True, many=True)
    advisors = RelatedCompanyAdvisorSerializer(source='company_advisors', read_only=True, many=True)
    technology_type = RelatedTechnologyTypeSerializer(read_only=True)
    industries = RelatedIndustrySerializer(read_only=True, many=True)
    ipo_status_type = RelatedIPOStatusSerializer(read_only=True)
    last_funding_type = RelatedFundingTypeSerializer(read_only=True)
    funding_stage = RelatedFundingStageSerializer(read_only=True)
    last_equity_funding_stage = RelatedFundingStageSerializer(read_only=True)
    investment_types = RelatedInvestorTypeSerializer(read_only=True, many=True)
    investment_stages = RelatedFundingStageSerializer(read_only=True, many=True)

    class Meta:
        model = Company
        fields = [
            'uuid',
            'name',
            'summary',
            'description',
            'website',
            'duns',
            'nid',
            'cb_uuid',
            'cb_url',
            'linkedin_url',
            'facebook_url',
            'twitter_url',
            'affinity_id',
            'email',
            'phone_number',
            'technology_type',
            'industries',
            'hq_country',
            'hq_state_name',
            'hq_city_name',
            'hq_postal_code',
            'hq_regions_names',
            'address_line_1',
            'address_line_2',
            'image',
            'founders',
            'founded_on',
            'founded_on_precision',
            'year_founded',
            'company_type',
            'operating_status',
            'num_sub_organizations',
            'revenue_range',
            'exit_on',
            'exit_on_precision',
            'closed_on',
            'closed_on_precision',
            'cb_industries_names',
            'cb_industries_groups',
            'ipo_money_raised',
            'ipo_valuation',
            'went_public_on',
            'delisted_on',
            'delisted_on_precision',
            'stock_symbol',
            'stock_exchange_symbol',
            'stock_cb_url',
            'patents_granted_count',
            'trademarks_count',
            'popular_patent_class',
            'popular_trademark_class',
            'founders_count',
            'has_diversity_on_founders',
            'has_women_on_founders',
            'has_black_on_founders',
            'has_hispanic_on_founders',
            'has_asian_on_founders',
            'has_meo_on_founders',
            'advisors',
            'num_employees_range',
            'actively_hiring',
            'last_layoff_date',
            'last_key_employee_change',
            'ipo_status_type',
            'last_funding_type',
            'funding_stage',
            'last_equity_funding_stage',
            'funding_rounds_count',
            'last_funding_date',
            'last_funding_amount',
            'total_funding_amount',
            'last_equity_funding_amount',
            'total_equity_funding_amount',
            'investors_names',
            'num_lead_investors',
            'num_investors',
            'was_acquired',
            'acquired_on',
            'acquired_on_precision',
            'acquisition_name',
            'acquisition_cb_url',
            'acquirer_name',
            'acquirer_cb_url',
            'acquisition_price',
            'acquisition_type',
            'acquisition_terms',
            'made_acquisitions',
            'num_acquisitions',
            'valuation_range',
            'valuation_date',
            'investment_types',
            'investment_stages',
            'accelerators_names',
            'cb_rank',
            'cb_rank_delta_d7',
            'cb_rank_delta_d30',
            'cb_rank_delta_d90',
            'cb_num_similar_companies',
            'cb_hub_tags',
            'cb_growth_category',
            'cb_growth_confidence',
            'cb_num_articles',
            'cb_num_events_appearances',
            'web_monthly_visits',
            'web_avg_visits_m6',
            'web_monthly_visits_growth',
            'web_visit_duration',
            'web_visit_duration_growth',
            'web_pages_per_visit',
            'web_pages_per_visit_growth',
            'web_bounce_rate',
            'web_bounce_rate_growth',
            'web_traffic_rank',
            'web_monthly_traffic_rank_change',
            'web_monthly_traffic_rank_growth',
            'web_tech_count',
            'apps_count',
            'apps_downloads_count_d30',
            'tech_stack_product_count',
            'it_spending_amount',
            'ipo_status',
            'last_equity_funding_type',
            'investor_types',
            'created_at',
            'updated_at',
        ]


class CompanyCreateSerializer(ModelSerializer):

    hq_country = CountryField()

    class Meta:
        model = Company
        exclude = ["id", "uuid", "extras", "created_at", "updated_at"]
        read_only_fields = ["id", "uuid", "extras", "creator", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"required": True},
        }

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request", None)
        user = getattr(request, "user", None) if request else None
        creator = user if user and user.is_authenticated else None

        industries = validated_data.pop("industries", [])
        investor_types = validated_data.pop("investor_types", [])
        investment_stages = validated_data.pop("investment_stages", [])

        company = Company.objects.create(creator=creator, **validated_data)

        if industries:
            company.industries.set(industries)
        if investor_types:
            company.investor_types.set(investor_types)
        if investment_stages:
            company.investment_stages.set(investment_stages)

        return company


class FounderSerializer(serializers.ModelSerializer):
    country = CountryField()
    companies = RelatedFounderCompanySerializer(source='foundings', read_only=True, many=True)

    class Meta:
        model = Founder
        fields = [
            'uuid',
            'name',
            'bio',
            'linkedin_url',
            'website',
            'country',
            'location',
            'bachelor_grad_year',
            'bachelor_degree_type',
            'bachelor_school',
            'graduate_degree_type',
            'graduate_school',
            'phd_school',
            'has_military_or_govt_background',
            'military_or_govt_background',
            'companies',
            'created_at',
            'updated_at',
        ]


class AdvisorSerializer(serializers.ModelSerializer):
    country = CountryField()
    companies = RelatedAdvisorCompanySerializer(source='company_advisors', read_only=True, many=True)

    class Meta:
        model = Advisor
        fields = [
            'uuid',
            'name',
            'bio',
            'linkedin_url',
            'website',
            'country',
            'location',
            'bachelor_grad_year',
            'bachelor_degree_type',
            'bachelor_school',
            'graduate_degree_type',
            'graduate_school',
            'phd_school',
            'has_military_or_govt_background',
            'military_or_govt_background',
            'companies',
            'created_at',
            'updated_at',
        ]


class GrantSerializer(serializers.ModelSerializer):
    company = RelatedCompanySerializer(read_only=True)

    class Meta:
        model = Grant
        exclude = ['id', 'extras']


class ClinicalStudySerializer(serializers.ModelSerializer):
    company = RelatedCompanySerializer(read_only=True)

    class Meta:
        model = ClinicalStudy
        exclude = ['id']


class PatentApplicationSerializer(serializers.ModelSerializer):
    company = RelatedCompanySerializer(read_only=True)

    class Meta:
        model = PatentApplication
        exclude = ['id', 'extras']


class IPOStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = IPOStatus
        exclude = ['id']


class InvestorTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = InvestorType
        exclude = ['id']


class FundingTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingType
        exclude = ['id']


class FundingStageSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingStage
        exclude = ['id']


class TechnologyTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = TechnologyType
        exclude = ['id']


class IndustrySerializer(serializers.ModelSerializer):

    class Meta:
        model = Industry
        exclude = ['id']
