from companies.api.serializers import CompanyRelationSerializer
from rest_framework import serializers

from ..models import Deal, Deck, DualUseCategory, DualUseSignal, Industry

__all__ = [
    'DualUseSignalRelationSerializer',
    'FounderSignalRelationSerializer',
    'IndustryRelationSerializer',
    'DealRelationSerializer',
    'DealSerializer',
    'DeckSerializer',
    'IndustrySerializer',
    'DualUseSignalSerializer',
]


class DualUseCategoryRelationSerializer(serializers.ModelSerializer):
    """A serializer for dual use category relations."""

    class Meta:
        model = DualUseCategory
        fields = ['uuid', 'name']


class DualUseSignalRelationSerializer(serializers.ModelSerializer):
    """A serializer for dual use signal relations."""

    class Meta:
        model = DualUseSignal
        fields = ['uuid', 'name']


class FounderSignalRelationSerializer(serializers.ModelSerializer):
    """A serializer for founders signal relations."""

    class Meta:
        model = DualUseSignal
        fields = ['uuid', 'name']


class IndustryRelationSerializer(serializers.ModelSerializer):
    """A serializer for industry relations."""

    class Meta:
        model = Industry
        fields = ['uuid', 'name']


class DealRelationSerializer(serializers.ModelSerializer):
    """A serializer for deals relations."""

    class Meta:
        model = Deal
        fields = ['uuid']


class DealSerializer(serializers.ModelSerializer):
    company = CompanyRelationSerializer(read_only=True)
    industries = DualUseSignalRelationSerializer(read_only=True, many=True)
    dual_use_signals = DualUseSignalRelationSerializer(read_only=True, many=True)
    founder_signals = DualUseSignalRelationSerializer(read_only=True, many=True)

    class Meta:
        model = Deal
        exclude = [
            'id',
            'name',
            'company_name',
            'creator',
        ]


class DeckSerializer(serializers.ModelSerializer):
    deal = DealRelationSerializer(read_only=True)

    class Meta:
        model = Deck
        exclude = ['id', 'ingestion_task_id', 'is_from_mailbox', 'creator']


class IndustrySerializer(serializers.ModelSerializer):

    class Meta:
        model = Industry
        exclude = ['id', 'creator']


class DualUseSignalSerializer(serializers.ModelSerializer):
    category = DualUseCategoryRelationSerializer(read_only=True)

    class Meta:
        model = DualUseSignal
        exclude = ['id', 'creator']
