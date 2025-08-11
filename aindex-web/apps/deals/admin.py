from django.contrib import admin, messages
from django.utils.translation.trans_real import ngettext

from imagekit.admin import AdminThumbnail
from import_export.admin import ImportExportModelAdmin
from rangefilter.filters import DateRangeQuickSelectListFilterBuilder

from .import_export import MissedDealResource
from .models import (Deal, Deck, DeckPage, DualUseCategory, DualUseSignal, FounderSignal, FundingRound, Industry,
                     MissedDeal)
from .tasks import refresh_deal_data


class DeckInline(admin.TabularInline):
    model = Deck
    fields = ['title', 'ingestion_status', 'file', 'file_format', 'creator']
    extra = 0
    raw_id_fields = ['creator']
    show_change_link = True


class DeckPageInline(admin.TabularInline):
    model = DeckPage
    extra = 0
    ordering = ['page_number']
    show_change_link = True


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_core', 'bg_color', 'text_color']
    list_display_links = ['name']
    list_filter = ['is_core', 'created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'name', 'description']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['creator']
    ordering = ['name']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Deal)
class DealAdmin(ImportExportModelAdmin):
    list_display = ['display_name', 'stage', 'funding_target', 'funding_raised', 'sent_to_affinity',
                    'quality_percentile', 'creator', 'created_at']
    list_display_links = ['display_name']
    list_filter = [
        'industries',
        'dual_use_signals',
        'founder_signals',
        'stage',
        'sent_to_affinity',
        'quality_percentile',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder())
    ]
    list_select_related = ['creator']
    filter_horizontal = ['industries', 'founder_signals', 'dual_use_signals']
    search_fields = ['id', 'uuid', 'name']
    readonly_fields = [
        'auto_recommendation',
        'auto_investment_rationale',
        'auto_pros',
        'auto_cons',
        'auto_thesis_fit_score',
        'auto_numeric_score',
        'auto_non_numeric_score',
        'auto_quality_percentile',
        'auto_confidence',
        'auto_description',
        'auto_problem',
        'auto_solution',
        'auto_thesis_fit',
        'auto_traction',
        'auto_intellectual_property',
        'auto_business_model',
        'auto_market_sizing',
        'auto_competition',
        'sbir_url',
        'id',
        'uuid',
        'created_at',
        'updated_at'
    ]
    raw_id_fields = ['company', 'creator']
    inlines = [DeckInline]
    actions = ['refresh_deal_data']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form

    @admin.action(description="Refresh data for selected deals")
    def refresh_deal_data(self, request, queryset):
        for deal in queryset:
            refresh_deal_data.delay(pk=deal.pk)

        count = len(queryset)
        self.message_user(
            request,
            ngettext(
                '%d deal is set to be refreshed',
                '%d deals are set to be refreshed',
                count,
            ) % count,
            messages.SUCCESS,
        )


@admin.register(FundingRound)
class FundingRoundAdmin(admin.ModelAdmin):
    list_display = ['deal', 'stage', 'target_amount', 'raised_amount']
    list_display_links = ['deal', 'stage']
    list_filter = ['deal__industries', 'is_active', 'date', 'created_at', 'updated_at']
    list_select_related = ['deal']
    search_fields = ['id', 'uuid', 'stage']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['deal', 'creator']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'ingestion_status', 'file_format', 'creator', 'created_at']
    list_display_links = ['display_name', 'ingestion_status']
    list_filter = [
        'deal__industries',
        'ingestion_status',
        'file_format',
        'is_from_mailbox',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder())
    ]
    list_select_related = ['creator']
    search_fields = ['id', 'uuid', 'title', 'subtitle', 'file']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['deal', 'creator']
    inlines = [DeckPageInline]

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
    list_display = ['name', 'bg_color', 'text_color']
    list_display_links = ['name']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['creator']
    ordering = ['name']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(DualUseSignal)
class DualUseSignalAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_display_links = ['name']
    list_filter = ['category', 'created_at', 'updated_at']
    list_select_related = ['category']
    search_fields = ['id', 'uuid', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['creator']
    ordering = ['name']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(FounderSignal)
class FounderSignalAdmin(admin.ModelAdmin):
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['creator']
    ordering = ['name']

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(MissedDeal)
class MissedDealAdmin(ImportExportModelAdmin):
    admin_thumbnail = AdminThumbnail(image_field='image_xxs')

    list_display = ['admin_thumbnail', 'name', 'ipo_status',
                    'cb_industries_names', 'has_diversity_on_founders', 'funding_stage',
                    'total_funding_amount', 'updated_at']
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
        ('updated_at', DateRangeQuickSelectListFilterBuilder())
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
