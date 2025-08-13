from django_countries.serializer_fields import CountryField
from rest_framework import serializers

from ..models import Category, DocumentType, File, Paper, PaperAuthor, PaperAuthorship, Source

__all__ = [
    'SourceRelatedSerializer',
    'CategoryRelatedSerializer',
    'DocumentTypeRelatedSerializer',
    'PaperAuthorRelatedSerializer',
    'FileSerializer',
    'FileReadSerializer',
    'PaperSerializer',
    'PaperReadSerializer',
    'PaperProcessingStatusSerializer',
    'PaperAuthorSerializer',
    'SourceSerializer',
    'CategorySerializer',
    'DocumentTypeSerializer',
]


class SourceRelatedSerializer(serializers.ModelSerializer):

    class Meta:
        model = Source
        fields = ['uuid', 'name', 'code']


class CategoryRelatedSerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ['uuid', 'name', 'code']


class DocumentTypeRelatedSerializer(serializers.ModelSerializer):

    class Meta:
        model = DocumentType
        fields = ['uuid', 'name', 'code']


class PaperAuthorRelatedSerializer(serializers.ModelSerializer):

    class Meta:
        model = PaperAuthor
        fields = ['uuid', 'name']


class FileSerializer(serializers.ModelSerializer):
    source = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Source.objects.all(),
        required=False,
    )
    categories = serializers.SlugRelatedField(
        queryset=Category.objects.all(),
        slug_field='uuid',
        many=True,
        required=False,
    )

    class Meta:
        model = File
        fields = [
            'uuid',
            'file',
            'mime_type',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'tags',
            'categories',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['processing_status']


class FileReadSerializer(FileSerializer):
    source = SourceRelatedSerializer(read_only=True)
    categories = CategoryRelatedSerializer(read_only=True, many=True)
    file_name = serializers.CharField(read_only=True)

    class Meta(FileSerializer.Meta):
        fields = [
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


class RelatedAuthorPaperSerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(source='paper_uuid')
    title = serializers.CharField(source='paper_title')
    file = serializers.FileField(source='paper_file')
    publication_year = serializers.IntegerField()

    class Meta:
        model = PaperAuthorship
        fields = ['uuid', 'title', 'file', 'publication_year']


class PaperSerializer(serializers.ModelSerializer):
    source = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Source.objects.all(),
        required=False,
    )
    categories = serializers.SlugRelatedField(
        queryset=Category.objects.all(),
        slug_field='uuid',
        many=True,
        required=False,
    )
    document_types = serializers.SlugRelatedField(
        queryset=DocumentType.objects.all(),
        slug_field='uuid',
        many=True,
        required=False,
    )
    authors = serializers.SlugRelatedField(
        queryset=PaperAuthor.objects.all(),
        slug_field='uuid',
        many=True,
        required=False,
    )

    class Meta:
        model = Paper
        fields = [
            'uuid',
            'title',
            'abstract',
            'file',
            'mime_type',
            'raw_text',
            'text',
            'tldr',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'semantic_scholar_id',
            'arxiv_id',
            'publication_year',
            'publication_date',
            'license',
            'tags',
            'categories',
            'document_types',
            'authors',
            'created_at',
            'updated_at',
        ]


class PaperReadSerializer(PaperSerializer):
    source = SourceRelatedSerializer(read_only=True)
    categories = CategoryRelatedSerializer(read_only=True, many=True)
    document_types = DocumentTypeRelatedSerializer(read_only=True, many=True)
    authors = PaperAuthorRelatedSerializer(read_only=True, many=True)

    class Meta(PaperSerializer.Meta):
        fields = [
            'uuid',
            'title',
            'abstract',
            'file',
            'mime_type',
            'raw_text',
            'text',
            'tldr',
            'source',
            'src_id',
            'src_url',
            'src_download_url',
            'semantic_scholar_id',
            'arxiv_id',
            'publication_year',
            'publication_date',
            'license',
            'tags',
            'categories',
            'document_types',
            'authors',
            'citation_count',
            'created_at',
            'updated_at',
        ]
        read_only_field = ['citation_count']


class PaperProcessingStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = Paper
        fields = ['uuid', 'processing_status', 'updated_at']


class PaperAuthorSerializer(serializers.ModelSerializer):
    country = CountryField()
    papers = RelatedAuthorPaperSerializer(source='authorships', many=True, read_only=True)

    class Meta:
        model = PaperAuthor
        fields = [
            'uuid',
            'name',
            'bio',
            'linkedin_url',
            'website',
            'semantic_scholar_id',
            'arxiv_id',
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
            'citation_count',
            'paper_count',
            'h_index',
            'affiliations',
            'papers',
            'created_at',
            'updated_at',
        ]


class SourceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Source
        fields = [
            'uuid',
            'name',
            'code',
            'description',
            'website',
            'updated_at',
            'created_at',
        ]


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ['uuid', 'name', 'code', 'description', 'created_at', 'updated_at']


class DocumentTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = DocumentType
        fields = ['uuid', 'name', 'code', 'description', 'created_at', 'updated_at']
