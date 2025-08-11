from django.contrib.postgres import fields as postgres_fields

from drf_extra_fields.fields import DecimalRangeField, IntegerRangeField
from rest_framework import serializers

from ..models import (ClinicalStudy, Company, FundingStage, FundingType, Grant, Industry, InvestorType, IPOStatus,
                      PatentApplication, TechnologyType)

__all__ = [
    'TechnologyTypeRelationSerializer',
    'IndustryRelationSerializer',
    'FundingTypeRelationSerializer',
    'FundingStageRelationSerializer',
    'IPOStatusRelationSerializer',
    'InvestorTypeRelationSerializer',
    'CompanyRelationSerializer',
    'CompanySerializer',
    'GrantSerializer',
    'ClinicalStudySerializer',
    'PatentApplicationSerializer',
]


class ModelSerializer(serializers.ModelSerializer):

    serializer_field_mapping = {
        **serializers.ModelSerializer.serializer_field_mapping,
        postgres_fields.IntegerRangeField: IntegerRangeField,
        postgres_fields.DecimalRangeField: DecimalRangeField,
    }


class TechnologyTypeRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = TechnologyType
        fields = ['uuid', 'code', 'name']


class IndustryRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Industry
        fields = ['uuid', 'code', 'name']


class FundingTypeRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingType
        fields = ['uuid', 'code', 'name']


class FundingStageRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = FundingStage
        fields = ['uuid', 'code', 'name']


class IPOStatusRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = IPOStatus
        fields = ['uuid', 'code', 'name']


class InvestorTypeRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = InvestorType
        fields = ['uuid', 'code', 'name']


class CompanyRelationSerializer(serializers.ModelSerializer):
    """A serializer for company relations."""

    class Meta:
        model = Company
        fields = [
            'uuid',
            'name',
            'summary',
            'website',
            'cb_url',
            'nid',
            'image'
        ]


class CompanySerializer(ModelSerializer):

    hq_country = serializers.CharField()
    technology_type = TechnologyTypeRelationSerializer(read_only=True)
    industries = IndustryRelationSerializer(read_only=True, many=True)
    ipo_status_type = IPOStatusRelationSerializer(read_only=True)
    last_funding_type = FundingTypeRelationSerializer(read_only=True)
    funding_stage = FundingStageRelationSerializer(read_only=True)
    last_equity_funding_stage = FundingStageRelationSerializer(read_only=True)
    investment_types = InvestorTypeRelationSerializer(read_only=True, many=True)
    investment_stages = FundingStageRelationSerializer(read_only=True, many=True)

    class Meta:
        model = Company
        exclude = ['id', 'creator']


class GrantSerializer(serializers.ModelSerializer):
    company = CompanyRelationSerializer(read_only=True)

    class Meta:
        model = Grant
        exclude = ['id']


class ClinicalStudySerializer(serializers.ModelSerializer):
    company = CompanyRelationSerializer(read_only=True)

    class Meta:
        model = ClinicalStudy
        exclude = ['id']


class PatentApplicationSerializer(serializers.ModelSerializer):
    company = CompanyRelationSerializer(read_only=True)

    class Meta:
        model = PatentApplication
        exclude = ['id']
