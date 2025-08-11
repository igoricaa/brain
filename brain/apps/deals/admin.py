from django.contrib import admin

from imagekit.admin import AdminThumbnail
from import_export.admin import ImportExportModelAdmin
from polymorphic.admin import PolymorphicInlineSupportMixin, StackedPolymorphicInline
from rangefilter.filters import DateRangeQuickSelectListFilterBuilder

from .import_export import MissedDealResource
from .models import (
    Deal,
    DealAssessment,
    DealFile,
    Deck,
    DeckPage,
    DraftDeal,
    DualUseCategory,
    DualUseSignal,
    MissedDeal,
    Paper,
)


class DealFileInline(StackedPolymorphicInline):

    class DeckInline(StackedPolymorphicInline.Child):
        model = Deck
        fields = ['title', 'file', 'creator']
        extra = 0
        raw_id_fields = ['creator']
        show_change_link = True

    class PaperInline(StackedPolymorphicInline.Child):
        model = Paper
        fields = ['title', 'file', 'tldr', 'abstract', 'creator']
        extra = 0
        raw_id_fields = ['creator']
        show_change_link = True

    class GenericDealFileInline(StackedPolymorphicInline.Child):
        model = DealFile
        fields = ['description', 'file', 'src_download_url', 'creator']
        extra = 0
        raw_id_fields = ['creator']
        show_change_link = True

    model = DealFile
    child_inlines = [DeckInline, PaperInline, GenericDealFileInline]


class DealAssessmentInline(admin.StackedInline):
    model = DealAssessment
    extra = 0
    readonly_fields = [
        'created_at',
        'updated_at',
        'auto_tags',
        'auto_pros',
        'auto_cons',
        'auto_recommendation',
        'auto_investment_rationale',
        'auto_problem',
        'auto_solution',
        'auto_thesis_fit',
        'auto_auto_thesis_fit_score',
        'auto_traction',
        'auto_intellectual_property',
        'auto_business_model',
        'auto_market_sizing',
        'auto_competition',
        'auto_quality_percentile',
        'auto_numeric_score',
        'auto_non_numeric_score',
        'auto_confidence',
        'auto_parent_breakthroughs',
        'auto_sota_comparison',
        'auto_feasibility',
        'auto_technical_risk',
    ]
    ordering = ['-created_at']
    show_change_link = True


class DeckPageInline(admin.TabularInline):
    model = DeckPage
    extra = 0
    ordering = ['page_number']
    show_change_link = True


class BaseDealAdmin(PolymorphicInlineSupportMixin, ImportExportModelAdmin):
    list_display = [
        'display_name',
        'status',
        'funding_type',
        'funding_target',
        'funding_raised',
        'sent_to_affinity',
        'creator',
        'created_at',
    ]
    list_display_links = ['display_name']
    list_filter = [
        'status',
        'industries',
        'dual_use_signals',
        'funding_stage',
        'funding_type',
        'sent_to_affinity',
        'has_civilian_use',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    list_select_related = ['creator']
    filter_horizontal = ['industries', 'dual_use_signals']
    search_fields = ['id', 'uuid', 'name']
    readonly_fields = [
        'sbir_url',
        'id',
        'uuid',
        'created_at',
        'updated_at',
    ]
    raw_id_fields = ['company', 'creator']
    inlines = [DealFileInline, DealAssessmentInline]

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Deal)
class DealAdmin(BaseDealAdmin):

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(is_draft=False)


@admin.register(DraftDeal)
class DraftDealAdmin(BaseDealAdmin):
    pass


@admin.register(DealFile)
class DealFileAdmin(admin.ModelAdmin):
    list_display = ['description', 'file_name', 'mime_type', 'created_at']
    list_display_links = ['description', 'file_name']
    list_filter = [
        'deal__industries',
        'mime_type',
        'processing_status',
        'is_deleted',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    list_select_related = ['creator']
    search_fields = ['=id', '=uuid', 'deal__name', 'deal__company__name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    filter_horizontal = ['categories']
    raw_id_fields = ['deal', 'creator']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'mime_type', 'processing_status', 'created_at']
    list_display_links = ['display_name']
    list_filter = [
        'deal__industries',
        'processing_status',
        'mime_type',
        'is_from_mailbox',
        'is_deleted',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    list_select_related = ['creator']
    search_fields = ['id', 'uuid', 'title', 'subtitle', 'file']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['deal', 'creator']
    exclude = ['categories']
    inlines = [DeckPageInline]

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Paper)
class PaperAdmin(ImportExportModelAdmin):
    list_display = ['title', 'deal', 'tldr']
    list_select_related = ['deal']
    list_filter = ['document_types', 'categories', 'source', 'created_at', 'updated_at']
    filter_horizontal = ['categories', 'document_types']
    raw_id_fields = ['creator', 'authors']
    search_fields = ['=id', '=uuid', '=title']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(DeckPage)
class DeckPageAdmin(admin.ModelAdmin):
    admin_thumbnail = AdminThumbnail(image_field='screenshot_xs')
    list_display = ['admin_thumbnail', 'title', 'deck']
    list_display_links = ['admin_thumbnail', 'title', 'deck']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'title']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['deck']


@admin.register(DualUseCategory)
class DualUseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    list_display_links = ['name']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'name']
    prepopulated_fields = {'code': ['name']}
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(DualUseSignal)
class DualUseSignalAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category']
    list_display_links = ['name']
    list_filter = ['category', 'created_at', 'updated_at']
    list_select_related = ['category']
    search_fields = ['id', 'uuid', 'name']
    prepopulated_fields = {'code': ['name']}
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(DealAssessment)
class DealAssessmentAdmin(ImportExportModelAdmin):
    list_display = ['deal', 'quality_percentile', 'created_at']
    list_select_related = ['deal', 'deal__company']
    list_filter = [
        'deal__industries',
        'quality_percentile',
        'recommendation',
        'non_numeric_score',
        'confidence',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    search_fields = ['=id', '=uuid', 'deal__name', 'deal__company__name']
    readonly_fields = [
        'id',
        'uuid',
        'created_at',
        'updated_at',
        'auto_tags',
        'auto_pros',
        'auto_cons',
        'auto_recommendation',
        'auto_investment_rationale',
        'auto_problem',
        'auto_solution',
        'auto_thesis_fit',
        'auto_auto_thesis_fit_score',
        'auto_traction',
        'auto_intellectual_property',
        'auto_business_model',
        'auto_market_sizing',
        'auto_competition',
        'auto_quality_percentile',
        'auto_numeric_score',
        'auto_non_numeric_score',
        'auto_confidence',
        'auto_parent_breakthroughs',
        'auto_sota_comparison',
        'auto_feasibility',
        'auto_technical_risk',
    ]
    raw_id_fields = ['deal']


@admin.register(MissedDeal)
class MissedDealAdmin(ImportExportModelAdmin):
    admin_thumbnail = AdminThumbnail(image_field='image_xxs')

    list_display = [
        'admin_thumbnail',
        'name',
        'ipo_status',
        'cb_industries_names',
        'has_diversity_on_founders',
        'funding_stage',
        'total_funding_amount',
        'updated_at',
    ]
    list_display_links = ['admin_thumbnail', 'name']
    list_filter = [
        'was_in_deals',
        'ipo_status',
        'funding_stage',
        'has_diversity_on_founders',
        'has_women_on_founders',
        'has_black_on_founders',
        'has_hispanic_on_founders',
        'has_asian_on_founders',
        'has_meo_on_founders',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    list_select_related = ['ipo_status', 'creator']

    filter_horizontal = ['investor_types', 'investment_stages']

    search_fields = ['=id', '=uuid', 'name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['company', 'creator']

    resource_class = MissedDealResource

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form
