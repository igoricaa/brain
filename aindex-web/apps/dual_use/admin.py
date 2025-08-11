from django.contrib import admin, messages
from django.db.models import Count
from django.utils.translation import ngettext

from imagekit.admin import AdminThumbnail
from import_export.admin import ImportExportModelAdmin
from rangefilter.filters import DateRangeQuickSelectListFilterBuilder

from .import_export import ReportAdminResource
from .models import Report


@admin.register(Report)
class ReportAdmin(ImportExportModelAdmin):
    admin_thumbnail = AdminThumbnail(image_field='image_xxs')
    list_display = ['admin_thumbnail', 'name', 'ipo_status', 'year_founded', 'year_evaluated', 'technology_type',
                    'cb_industries_names', 'has_diversity_on_founders', 'funding_stage',
                    'total_funding_amount', 'thesis_fit', 'created_at']
    list_display_links = ['admin_thumbnail', 'name']
    list_filter = [
        'is_reviewed',
        'ipo_status',
        'funding_stage',
        'year_founded',
        'year_evaluated',
        'technology_type',
        'industries',
        'has_diversity_on_founders',
        'has_women_on_founders',
        'has_black_on_founders',
        'has_hispanic_on_founders',
        'has_asian_on_founders',
        'has_meo_on_founders',
        ('created_at', DateRangeQuickSelectListFilterBuilder()),
        ('updated_at', DateRangeQuickSelectListFilterBuilder())
    ]
    list_select_related = ['technology_type', 'ipo_status', 'creator']
    filter_horizontal = ['industries']
    search_fields = ['id', 'uuid', 'name']
    raw_id_fields = ['company', 'creator']
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    resource_class = ReportAdminResource
    actions = ['mark_reviewed', 'mark_unreviewed']

    def get_form(self, request, *args, **kwargs):
        """Pre-populate new instance creator"""
        form = super().get_form(request, *args, **kwargs)
        form.base_fields['creator'].initial = request.user
        return form

    def save_formset(self, request, form, formset, change):
        """Try to assign the current user as the creator of new inline instances"""
        instances = formset.save(commit=False)
        for obj in formset.deleted_objects:
            obj.delete()
        for instance in instances:
            if hasattr(instance, 'creator') and not instance.id and not instance.creator:
                instance.creator = request.user
            instance.save()
        formset.save_m2m()

    @admin.action(description='Mark selected companies as reviewed')
    def mark_reviewed(self, request, queryset):
        for report in queryset:
            report.is_reviewed = True
            try:
                report.extras['reviewer'] = {'username': request.user.username}
            except (TypeError, AttributeError):
                pass
            report.save(update_fields=['is_reviewed', 'updated_at', 'extras'])

        updated = len(queryset)

        self.message_user(
            request,
            ngettext(
                '%d companies was successfully marked as reviewed.',
                '%d companies were successfully marked as reviewed.',
                updated,
            )
            % updated,
            messages.SUCCESS,
        )

    @admin.action(description='Mark selected companies as need to be reviewed')
    def mark_unreviewed(self, request, queryset):
        for report in queryset:
            report.is_reviewed = False
            try:
                report.extras['reviewer'] = {}
            except (TypeError, AttributeError):
                pass
            report.save(update_fields=['is_reviewed', 'updated_at', 'extras'])

        updated = len(queryset)

        self.message_user(
            request,
            ngettext(
                '%d companies was successfully marked as need to be reviewed.',
                '%d companies were successfully marked as need to be reviewed.',
                updated,
            )
            % updated,
            messages.SUCCESS,
        )

    def get_export_queryset(self, request):
        queryset = super().get_export_queryset(request)
        queryset = queryset\
            .select_related('funding_stage', 'last_funding_type', 'last_funding_type')\
            .prefetch_related('industries')\
            .annotate(grants_count=Count('grant'))
        return queryset
