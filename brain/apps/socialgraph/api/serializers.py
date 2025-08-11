from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from ..models import Education, Experience, Profile

__all__ = ["ProfileSerializer", "ExperienceSerializer", "EducationSerializer"]


class ProfileRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Profile
        fields = ["uuid", "name"]


class ExperienceRelationSerializer(serializers.ModelSerializer):

    duration = serializers.SerializerMethodField()

    class Meta:
        model = Experience
        fields = [
            "uuid",
            "company_name",
            "title",
            "location",
            "description",
            "website",
            "linkedin_url",
            "date_from",
            "date_to",
            "duration",
        ]

    def get_duration(self, obj) -> dict | None:
        if not obj.duration:
            return None

        return {
            'days': obj.duration.days,
        }


class EducationRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Education
        fields = [
            "uuid",
            "institution_name",
            "program_name",
            "description",
            "website",
            "linkedin_url",
            "date_from",
            "date_to",
        ]


class ProfileSerializer(serializers.ModelSerializer):
    country = CountryField()
    experiences = ExperienceRelationSerializer(read_only=True, many=True)
    educations = EducationRelationSerializer(read_only=True, many=True)

    class Meta:
        model = Profile
        exclude = ["id", "extras"]


class ExperienceSerializer(serializers.ModelSerializer):

    profile = ProfileRelationSerializer(read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Experience
        exclude = ["id", "extras"]

    def get_duration(self, obj) -> dict | None:
        if not obj.duration:
            return None

        return {
            'days': obj.duration.days,
        }


class EducationSerializer(serializers.ModelSerializer):

    profile = ProfileRelationSerializer(read_only=True)

    class Meta:
        model = Education
        exclude = ["id", "extras"]
