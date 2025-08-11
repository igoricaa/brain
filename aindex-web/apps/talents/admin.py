from django.contrib import admin

from import_export.admin import ImportExportModelAdmin

from .models import Founder, FounderEducation, FounderExperience


class FounderExperienceInline(admin.TabularInline):
    model = FounderExperience
    extra = 0
    show_change_link = True


class FounderEducationInline(admin.TabularInline):
    model = FounderEducation
    extra = 0
    show_change_link = True


@admin.register(Founder)
class FounderAdmin(ImportExportModelAdmin):
    list_display = ['name', 'company', 'title', 'has_military_or_govt_background', 'prior_founding_count']
    list_select_related = ['company']
    list_filter = ['has_military_or_govt_background', 'company__industries', 'company__technology_type',
                   'created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'name', 'company__name']
    raw_id_fields = ['company']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    inlines = [FounderExperienceInline, FounderEducationInline]


@admin.register(FounderExperience)
class FounderExperienceAdmin(ImportExportModelAdmin):
    list_display = ['founder', 'company_name', 'title', 'duration', 'date_from', 'date_to']
    list_display_links = ['company_name', 'title']
    list_select_related = ['founder']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'company_name', 'founder__name']
    raw_id_fields = ['founder']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']


@admin.register(FounderEducation)
class FounderEducationAdmin(ImportExportModelAdmin):
    list_display = ['founder', 'program_name', 'institution_name', 'date_from', 'date_to']
    list_display_links = ['founder', 'program_name', 'institution_name']
    list_select_related = ['founder']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'institution_name', 'program__name', 'founder__name']
    raw_id_fields = ['founder']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
