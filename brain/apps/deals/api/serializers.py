from rest_framework import serializers

from companies.api.serializers import (
    RelatedCompanySerializer,
    RelatedFundingStageSerializer,
    RelatedFundingTypeSerializer,
    RelatedIndustrySerializer,
)
from companies.models import Company, FundingStage, FundingType, Industry

from ..models import Deal, DealFile, Deck, DraftDeal, DualUseCategory, DualUseSignal, Paper, DealAssessment

__all__ = [
    'RelatedDualUseSignalSerializer',
    'RelatedDealSerializer',
    'DealSerializer',
    'DealReadSerializer',
    'DraftDealSerializer',
    'DealFileSerializer',
    'DealFileReadSerializer',
    'DeckSerializer',
    'PaperSerializer',
    'DualUseSignalSerializer',
    'DealAssessmentSerializer',
    'DealAssessmentReadSerializer',
]


class RelatedDualUseCategorySerializer(serializers.ModelSerializer):
    """A serializer for dual use category relations."""

    class Meta:
        model = DualUseCategory
        fields = ['uuid', 'name', 'code']


class RelatedDualUseSignalSerializer(serializers.ModelSerializer):
    """A serializer for dual use signal relations."""

    class Meta:
        model = DualUseSignal
        fields = ['uuid', 'name', 'code']


class RelatedDealSerializer(serializers.ModelSerializer):
    """A serializer for deals relations."""

    class Meta:
        model = Deal
        fields = ['uuid']


class DealSerializer(serializers.ModelSerializer):
    company = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Company.objects.all(),
        required=True,
    )
    industries = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Industry.objects.all(),
        required=False,
        many=True,
    )
    dual_use_signals = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=DualUseSignal.objects.all(),
        required=False,
        many=True,
    )
    funding_stage = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=FundingStage.objects.all(),
        required=False,
    )
    funding_type = serializers.SlugRelatedField(
        slug_field='uuid', queryset=FundingType.objects.all(), required=False, many=True
    )

    class Meta:
        model = Deal
        fields = [
            'uuid',
            'name',
            'company',
            'description',
            'website',
            'status',
            'industries',
            'dual_use_signals',
            'funding_stage',
            'funding_type',
            'funding_target',
            'funding_raised',
            'investors_names',
            'partners_names',
            'customers_names',
            'processing_status',
            'sent_to_affinity',
            'has_civilian_use',
            'govt_relationships',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['status']


class DealReadSerializer(DealSerializer):
    company = RelatedCompanySerializer(read_only=True)
    industries = RelatedIndustrySerializer(read_only=True, many=True)
    dual_use_signals = RelatedDualUseSignalSerializer(read_only=True, many=True)
    funding_stage = RelatedFundingStageSerializer(read_only=True)
    funding_type = RelatedFundingTypeSerializer(read_only=True)


class DraftDealSerializer(DealReadSerializer):
    company = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Company.objects.all(),
        required=False,
    )

    class Meta(DealSerializer.Meta):
        model = DraftDeal


class DealFileSerializer(serializers.ModelSerializer):
    deal = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Deal.all_objects.all(),  # Use all_objects to include draft deals
        required=True,
    )

    class Meta:
        model = DealFile
        exclude = ['id', 'processing_task_id', 'creator']


class DealFileReadSerializer(DealFileSerializer):
    deal = RelatedDealSerializer(read_only=True)


class DeckSerializer(DealFileSerializer):

    class Meta:
        model = Deck
        exclude = ['id', 'processing_task_id', 'is_from_mailbox', 'creator']


class PaperSerializer(DealFileSerializer):

    class Meta:
        model = Paper
        exclude = ['id', 'processing_task_id', 'creator']


class DualUseSignalSerializer(serializers.ModelSerializer):
    category = RelatedDualUseCategorySerializer(read_only=True)

    class Meta:
        model = DualUseSignal
        exclude = ['id']


class DealAssessmentSerializer(serializers.ModelSerializer):
    deal = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Deal.all_objects.all(), required=True  # Use all_objects to include draft deals
    )

    class Meta:
        model = DealAssessment
        fields = [
            'uuid',
            'deal',
            'quality_percentile',
            'recommendation',
            'investment_rationale',
            'pros',
            'cons',
        ]


class DealAssessmentReadSerializer(DealAssessmentSerializer):
    deal = RelatedDealSerializer(read_only=True)
    
    class Meta(DealAssessmentSerializer.Meta):
        model = DealAssessment
        # Expose AI (auto_*) read-only fields alongside manual fields for the redesigned Deal Detail view
        fields = DealAssessmentSerializer.Meta.fields + [
            'created_at',
            'updated_at',
            # Auto (AI) assessment mirrors
            'auto_quality_percentile',
            'auto_recommendation',
            'auto_investment_rationale',
            'auto_pros',
            'auto_cons',
            # Keeping room for future panels if needed
            'auto_problem',
            'auto_solution',
            'auto_thesis_fit',
            'auto_traction',
            'auto_intellectual_property',
            'auto_business_model',
            'auto_market_sizing',
            'auto_competition',
        ]
