from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from companies.api.serializers import (
    RelatedCompanySerializer,
    RelatedFundingStageSerializer,
    RelatedFundingTypeSerializer,
    RelatedIndustrySerializer,
    RelatedInvestorTypeSerializer,
    RelatedIPOStatusSerializer,
    RelatedTechnologyTypeSerializer,
)

from ..models import Report

__all__ = ["ReportSerializer"]


class ReportSerializer(serializers.ModelSerializer):

    company = RelatedCompanySerializer(read_only=True)
    hq_country = CountryField()
    technology_type = RelatedTechnologyTypeSerializer(read_only=True)
    industries = RelatedIndustrySerializer(read_only=True, many=True)
    ipo_status = RelatedIPOStatusSerializer(read_only=True)
    funding_stage = RelatedFundingStageSerializer(read_only=True)
    last_funding_type = RelatedFundingTypeSerializer(read_only=True)
    last_equity_funding_type = RelatedFundingTypeSerializer(read_only=True)
    investor_types = RelatedInvestorTypeSerializer(read_only=True, many=True)
    investment_stages = RelatedFundingStageSerializer(read_only=True, many=True)

    class Meta:
        model = Report
        exclude = ["id", "extras"]
