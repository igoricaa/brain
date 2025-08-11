from django.urls import path

from . import views

app_name = 'deals'

urlpatterns = [
    path('', views.DealsDashboardView.as_view(), name='deals-dashboard'),
    path('decks/add', views.DeckCreateView.as_view(), name='deck-create'),
    path('fresh', views.FreshDealsView.as_view(), name='deal-list-fresh'),
    path('reviewed', views.ReviewedDealsView.as_view(), name='deal-list-reviewed'),
    path('<uuid:uuid>/', views.DealDetailView.as_view(), name='deal-detail'),
    path('<uuid:uuid>/update', views.DealUpdateView.as_view(), name='deal-update'),
    path('<uuid:uuid>/refresh', views.DealRefreshView.as_view(), name='deal-refresh'),
    path('<uuid:uuid>/delete', views.DealDeleteView.as_view(), name='deal-delete'),
    path('<uuid:uuid>/assessment', views.DealAssessmentView.as_view(), name='deal-assessment'),
    path('<uuid:uuid>/processing-status', views.DealProcessingStatusView.as_view(), name='deal-processing-status'),
    path('missed', views.MissedDealsListView.as_view(), name='missed-deal-list'),
    path('dash/data/', views.DealsDashboardDataView.as_view(), name='deals-dashboard-data'),
]
