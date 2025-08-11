from django.contrib import admin
from django.db.models import Count
from django.utils.translation import gettext_lazy as _

from imagekit.admin import AdminThumbnail
from import_export.admin import ImportExportModelAdmin
from rangefilter.filters import DateRangeQuickSelectListFilterBuilder

from deals.models import Deal, MissedDeal
from dual_use.models import Report

from .models import (
    Advisor,
    ClinicalStudy,
    Company,
    CompanyAdvisor,
    Founder,
    Founding,
    FundingStage,
    FundingType,
    Grant,
    Industry,
    InvestorType,
    IPOStatus,
    PatentApplication,
    TechnologyType,
)


class DealInline(admin.TabularInline):
    model = Deal
    fields = ['funding_stage', 'funding_target', 'funding_raised', 'sent_to_affinity']
    readonly_fields = ['created_at']
    extra = 0
    show_change_link = True


class MissedDealInline(admin.TabularInline):
    model = MissedDeal
    fields = ['last_funding_date', 'funding_stage', 'ipo_status', 'last_funding_amount', 'total_funding_amount']
    readonly_fields = ['created_at']
    extra = 0
    show_change_link = True


class DuaUseReportInline(admin.TabularInline):
    model = Report
    verbose_name = _('Dual Use Report')
    verbose_name_plural = _('Dual Use Reports')
    fields = [
        'year_evaluated',
        'thesis_fit',
        'funding_stage',
        'ipo_status',
        'last_funding_amount',
        'total_funding_amount',
    ]
    readonly_fields = ['created_at']
    ordering = ['year_evaluated']
    extra = 0
    show_change_link = True


class CompanyFounderInline(admin.TabularInline):
    model = Founding
    verbose_name = _('Founder')
    verbose_name_plural = _('Founders')
    raw_id_fields = ['founder']
    extra = 0
    show_change_link = True


class FounderCompanyInline(admin.TabularInline):
    model = Founding
    verbose_name = _('Company')
    verbose_name_plural = _('Companies')
    raw_id_fields = ['company']
    extra = 0
    show_change_link = True


class AdvisorCompanyInline(admin.TabularInline):
    model = CompanyAdvisor
    verbose_name = _('Company')
    verbose_name_plural = _('Companies')
    raw_id_fields = ['company']
    extra = 0
    show_change_link = True


class GrantInline(admin.TabularInline):
    model = Grant
    fields = ['name', 'program_name', 'granting_agency', 'phase', 'award_year', 'potential_amount']
    extra = 0
    show_change_link = True


class PatentApplicationInline(admin.TabularInline):
    model = PatentApplication
    fields = [
        'invention_title',
        'first_applicant_name',
        'first_inventor_name',
        'status_description',
        'type_label',
        'type_category',
    ]
    extra = 0
    show_change_link = True


class ClinicalStudyInline(admin.TabularInline):
    model = ClinicalStudy
    fields = ['title', 'company', 'start_date_str', 'completion_date_str', 'status']
    extra = 0
    show_change_link = True


@admin.register(TechnologyType)
class TechnologyTypeAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(IPOStatus)
class IPOStatusAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(FundingType)
class FundingTypeAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['id']


@admin.register(FundingStage)
class FundingStageAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['id']


@admin.register(InvestorType)
class InvestorTypeAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(Industry)
class IndustryAdmin(ImportExportModelAdmin):
    list_display = ['name', 'code', 'description']
    list_display_links = ['name', 'code']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['=id', '=uuid', '=code', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    ordering = ['name']


@admin.register(Company)
class CompanyAdmin(ImportExportModelAdmin):
    admin_thumbnail = AdminThumbnail(image_field='image_xxs')

    list_display = [
        'admin_thumbnail',
        'name',
        'ipo_status',
        'year_founded',
        'technology_type',
        'cb_industries_names',
        'has_diversity_on_founders',
        'funding_stage',
        'total_funding_amount',
        'updated_at',
    ]
    list_display_links = ['admin_thumbnail', 'name']
    list_filter = [
        'ipo_status',
        'funding_stage',
        'year_founded',
        'technology_type',
        'industries',
        'has_diversity_on_founders',
        'has_women_on_founders',
        'has_black_on_founders',
        'has_hispanic_on_founders',
        'has_asian_on_founders',
        'has_meo_on_founders',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder()),
    ]
    list_select_related = ['technology_type', 'ipo_status', 'creator']
    filter_horizontal = ['industries', 'investor_types', 'investment_stages']

    search_fields = ['=id', '=uuid', 'name']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    raw_id_fields = ['creator']

    inlines = [
        CompanyFounderInline,
        DealInline,
        MissedDealInline,
        DuaUseReportInline,
        GrantInline,
        PatentApplicationInline,
        ClinicalStudyInline,
    ]

    def get_form(self, request, *args, **kwargs):
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form


@admin.register(Founder)
class FounderAdmin(ImportExportModelAdmin):
    list_display = ['name', 'company_count', 'has_military_or_govt_background', 'country', 'linkedin_url']
    list_filter = [
        'country',
        'created_at',
        'updated_at',
    ]
    search_fields = ['=id', '=uuid', 'name', 'founding__company__name', 'linkedin_url']
    raw_id_fields = ['company']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']

    inlines = [FounderCompanyInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count=Count('founding'))

    @admin.display(description=_("companies"), ordering="company_count")
    def company_count(self, obj):
        return obj.company_count


@admin.register(Advisor)
class AdvisorAdmin(ImportExportModelAdmin):
    list_display = ['name', 'company_count', 'has_military_or_govt_background', 'country', 'linkedin_url']
    list_filter = [
        'country',
        'created_at',
        'updated_at',
    ]
    search_fields = ['=id', '=uuid', 'name', 'company_advisor__company__name', 'linkedin_url']
    raw_id_fields = ['company']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']

    inlines = [AdvisorCompanyInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(company_count=Count('company_advisor'))

    @admin.display(description=_("companies"), ordering="company_count")
    def company_count(self, obj):
        return obj.company_count


@admin.register(Grant)
class GrantAdmin(ImportExportModelAdmin):
    list_display = ['company', 'name', 'granting_agency', 'obligated_amount', 'potential_amount']
    list_display_links = ['company', 'name']
    list_select_related = ['company']
    list_filter = [
        'company__industries',
        'company__technology_type',
        'company__year_founded',
        'award_year',
        'created_at',
        'updated_at',
    ]
    search_fields = ['id', 'uuid', 'name', 'granting_agency', 'company__name']
    raw_id_fields = ['company']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']


@admin.register(PatentApplication)
class PatentApplicationAdmin(ImportExportModelAdmin):
    list_display = ['invention_title', 'company_name', 'status_description']
    list_display_links = ['invention_title', 'company_name']
    list_select_related = ['company']
    list_filter = [
        'type_label',
        'type_category',
        'filing_date',
        'grant_date',
        'status_description',
        'created_at',
        'updated_at',
    ]
    search_fields = [
        '=id',
        '=uuid',
        'invention_title',
        'patent_number',
        'number',
        'confirmation_number',
        'company__name',
    ]
    raw_id_fields = ['company']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ClinicalStudy)
class ClinicalStudyAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'start_date_str', 'completion_date_str', 'status']
    list_select_related = ['company']
    list_filter = ['status', 'created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'title', 'lead_sponsor_name', 'company__name']
    readonly_fields = ['id', 'uuid', 'ctg_url', 'created_at', 'updated_at']
    raw_id_fields = ['company']
