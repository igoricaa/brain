from rest_framework import serializers

from companies.api.serializers import (
    RelatedCompanySerializer,
    RelatedFundingStageSerializer,
    RelatedFundingTypeSerializer,
    RelatedIndustrySerializer,
)
from companies.models import Company, FundingStage, FundingType, Industry
from library.api.serializers import FileReadSerializer, FileSerializer
from library.api.serializers import PaperSerializer as LibraryPaperSerializer

from ..models import Deal, DealAssessment, DealFile, Deck, DraftDeal, DualUseCategory, DualUseSignal, Paper

__all__ = [
    'RelatedDualUseSignalSerializer',
    'RelatedDealSerializer',
    'DealSerializer',
    'DealReadSerializer',
    'DraftDealSerializer',
    'DealFileSerializer',
    'DealAssessmentSerializer',
    'DealAssessmentReadSerializer',
    'DealFileReadSerializer',
    'DeckSerializer',
    'DeckReadSerializer',
    'PaperSerializer',
    'PaperReadSerializer',
    'DualUseSignalSerializer',
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
        fields = ['uuid', 'name']


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
    last_assessment_created_at = serializers.DateTimeField(read_only=True)

    class Meta(DealSerializer.Meta):
        fields = DealSerializer.Meta.fields + ['last_assessment_created_at']


class DraftDealSerializer(DealReadSerializer):
    company = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Company.objects.all(),
        required=False,
    )

    class Meta(DealSerializer.Meta):
        model = DraftDeal


class DealAssessmentSerializer(serializers.ModelSerializer):
    deal = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Deal.objects.all(),
        required=True,
    )

    class Meta:
        model = DealAssessment
        fields = [
            'uuid',
            'deal',
            'problem_solved',
            'solution',
            'thesis_fit_evaluation',
            'thesis_fit_score',
            'customer_traction',
            'intellectual_property',
            'business_model',
            'tam',
            'competition',
            'quality_percentile',
            'numeric_score',
            'non_numeric_score',
            'confidence',
            'pros',
            'cons',
            'recommendation',
            'investment_rationale',
            'auto_problem_solved',
            'auto_solution',
            'auto_thesis_fit_evaluation',
            'auto_thesis_fit_score',
            'auto_customer_traction',
            'auto_intellectual_property',
            'auto_business_model',
            'auto_tam',
            'auto_competition',
            'auto_quality_percentile',
            'auto_numeric_score',
            'auto_non_numeric_score',
            'auto_confidence',
            'auto_pros',
            'auto_cons',
            'auto_recommendation',
            'auto_investment_rationale',
            'created_at',
            'updated_at',
        ]


class DealAssessmentReadSerializer(DealAssessmentSerializer):
    deal = RelatedDealSerializer(read_only=True)


class DealFileSerializer(FileSerializer):
    deal = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Deal.all_objects.all(),  # Include drafts for file uploads
        required=True,
    )

    class Meta(FileSerializer.Meta):
        model = DealFile
        fields = [
            'deal',
            'uuid',
            'file',
            'mime_type',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'tags',
            'categories',
            'processing_status',
            'created_at',
            'updated_at',
        ]


class DealFileReadSerializer(FileReadSerializer):
    deal = RelatedDealSerializer(read_only=True)

    class Meta(FileReadSerializer.Meta):
        fields = [
            'deal',
            'uuid',
            'file',
            'file_name',
            'mime_type',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'tags',
            'categories',
            'processing_status',
            'created_at',
            'updated_at',
        ]


class DeckSerializer(DealFileSerializer):

    class Meta:
        model = Deck
        fields = [
            'uuid',
            'file',
            'file_name',
            'title',
            'subtitle',
            'raw_text',
            'text',
            'mime_type',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'tags',
            'categories',
            'processing_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['processing_status']


class DeckReadSerializer(DeckSerializer):
    deal = RelatedDealSerializer(read_only=True)


class PaperSerializer(LibraryPaperSerializer):

    deal = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Deal.all_objects.all(),  # Include drafts for paper uploads
        required=True,
    )

    class Meta(LibraryPaperSerializer.Meta):
        model = Paper
        fields = ['deal'] + LibraryPaperSerializer.Meta.fields


class PaperReadSerializer(PaperSerializer):
    deal = RelatedDealSerializer(read_only=True)


class DualUseSignalSerializer(serializers.ModelSerializer):
    category = RelatedDualUseCategorySerializer(read_only=True)

    class Meta:
        model = DualUseSignal
        exclude = ['id']
