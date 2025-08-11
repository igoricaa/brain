from django.contrib import admin

from import_export.admin import ImportExportModelAdmin

from .models import City, State


@admin.register(State)
class StateAdmin(ImportExportModelAdmin):
    list_display = ["name", "code", "country", "id", "uuid"]
    list_display_links = ["name", "id", "uuid"]
    list_filter = ["country"]
    search_fields = ["name"]
    readonly_fields = ["id", "uuid", "created_at", "updated_at"]


@admin.register(City)
class CityAdmin(ImportExportModelAdmin):
    list_display = ["name", "state", "country", "id", "uuid"]
    list_display_links = ["name", "id", "uuid"]
    list_filter = ["country"]
    search_fields = ["name", "state__name"]
    readonly_fields = ["id", "uuid", "created_at", "updated_at"]
