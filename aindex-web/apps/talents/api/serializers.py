from companies.api.serializers import CompanyRelationSerializer
from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from ..models import Founder, FounderEducation, FounderExperience

__all__ = ['FounderExperienceRelationSerializer', 'FounderEducationRelationSerializer', 'FounderSerializer']


class FounderExperienceRelationSerializer(serializers.ModelSerializer):

    duration = serializers.SerializerMethodField()

    class Meta:
        model = FounderExperience
        fields = [
            'uuid',
            'company_name',
            'title',
            'location',
            'description',
            'date_from',
            'date_to',
            'duration',
            'website',
            'linkedin_url',
        ]

    def get_duration(self, obj) -> dict | None:
        if not obj.duration:
            return None

        return {
            'days': obj.duration.days,
        }


class FounderEducationRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = FounderEducation
        fields = [
            'uuid',
            'institution_name',
            'program_name',
            'description',
            'date_from',
            'date_to',
            'website',
            'linkedin_url',
        ]


class FounderSerializer(serializers.ModelSerializer):
    country = CountryField()
    company = CompanyRelationSerializer(read_only=True)
    experiences = FounderExperienceRelationSerializer(read_only=True, many=True)
    educations = FounderEducationRelationSerializer(read_only=True, many=True)

    class Meta:
        model = Founder
        exclude = ['id']
