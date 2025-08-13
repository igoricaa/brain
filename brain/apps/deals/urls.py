from django.urls import path

from . import views

app_name = "deals"

urlpatterns = [
    # Dashboards and lists
    path("", views.deals_dashboard, name="dashboard"),
    path("list/", views.deals_list, name="deals_list"),
    path("fresh/", views.fresh_deals, name="fresh_deals"),
    path("reviewed/", views.reviewed_deals, name="reviewed_deals"),
    path("missed/", views.missed_deals, name="missed_deals"),
    path("upload/", views.deal_upload, name="deal_upload"),

    # Deal detail shells
    path("<uuid:uuid>/", views.deal_detail, name="deal_detail"),
    path("<uuid:uuid>/update/", views.deal_update, name="deal_update"),
    path("<uuid:uuid>/assessment/", views.deal_assessment, name="deal_assessment"),
    path("<uuid:uuid>/delete/", views.deal_confirm_delete, name="deal_confirm_delete"),
    path("<uuid:uuid>/deck/create/", views.deck_create, name="deck_create"),

    # Actions + status
    path("<uuid:uuid>/refresh/", views.deal_refresh, name="deal_refresh"),
    path("<uuid:uuid>/processing-status/", views.deal_processing_status, name="processing_status"),

    # Dashboard data JSON (T-0203 will implement aggregations)
    path("dash/data/", views.deals_dashboard_data, name="dashboard_data"),
]
