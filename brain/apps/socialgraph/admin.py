from django.contrib import admin

from import_export.admin import ImportExportModelAdmin

from .models import Education, Experience, Profile


class ExperienceInline(admin.TabularInline):
    model = Experience
    extra = 0
    show_change_link = True


class EducationInline(admin.TabularInline):
    model = Education
    extra = 0
    show_change_link = True


@admin.register(Profile)
class ProfileAdmin(ImportExportModelAdmin):
    list_display = ['name', 'has_military_or_govt_background', 'linkedin_url']
    list_filter = ['has_military_or_govt_background', 'created_at', 'updated_at']
    search_fields = ['=id', '=uuid', 'name', 'linkedin_url']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
    inlines = [ExperienceInline, EducationInline]


@admin.register(Experience)
class ExperienceAdmin(ImportExportModelAdmin):
    list_display = ['profile', 'company_name', 'title', 'duration', 'date_from', 'date_to']
    list_display_links = ['company_name', 'title']
    list_select_related = ['profile']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'company_name', 'profile__name']
    raw_id_fields = ['profile']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']


@admin.register(Education)
class EducationAdmin(ImportExportModelAdmin):
    list_display = ['profile', 'program_name', 'institution_name', 'date_from', 'date_to']
    list_display_links = ['profile', 'program_name', 'institution_name']
    list_select_related = ['profile']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['id', 'uuid', 'institution_name', 'program__name', 'profile__name']
    raw_id_fields = ['profile']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
