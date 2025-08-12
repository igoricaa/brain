from django.urls import path

from . import views

app_name = "dual-use"

urlpatterns = [
    # Dashboard
    path("", views.du_dashboard, name="dashboard"),

    # Reports (shell routes)
    path("reports/", views.report_list, name="report-list"),
    path("reports/unreviewed/", views.unreviewed_report_list, name="unreviewed-report-list"),
    path("reports/add/", views.report_create, name="report-create"),
    path("reports/<uuid:uuid>/", views.report_detail, name="report-detail"),
    path("reports/<uuid:uuid>/update/", views.report_update, name="report-update"),
    path("reports/<uuid:uuid>/delete/", views.report_delete, name="report-delete"),

    # Placeholder for dashboard data (hooked by templates later)
    path("summary/data/", views.summary_data, name="summary-data"),
]

