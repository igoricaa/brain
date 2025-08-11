from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from ..models import City, State


class StateRelationSerializer(serializers.ModelSerializer):

    class Meta:
        model = State
        fields = ['uuid', 'name', 'code']


class StateSerializer(serializers.ModelSerializer):
    country = CountryField()

    class Meta:
        model = State
        fields = ['uuid', 'name', 'code', 'country']


class CitySerializer(serializers.ModelSerializer):
    state = StateRelationSerializer(read_only=True)
    country = CountryField()

    class Meta:
        model = City
        fields = ['uuid', 'name', 'code', 'country', 'state']
