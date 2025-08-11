from django.urls import path

from . import views

app_name = 'dual-use'

urlpatterns = [
    path('', views.DashboardView.as_view(), name='dashboard'),
    path('reports/', views.ReportListView.as_view(), name='report-list'),
    path('reports/unreviewed/', views.UnreviewedReportListView.as_view(), name='unreviewed-report-list'),
    path('reports/add/', views.ReportCreateView.as_view(), name='report-create'),
    path('reports/import/', views.ReportImportView.as_view(), name='report-import'),
    path('reports/<uuid:uuid>/', views.ReportDetailView.as_view(), name='report-detail'),
    path('reports/<uuid:uuid>/update/', views.ReportUpdateView.as_view(), name='report-update'),
    path('reports/<uuid:uuid>/review/', views.ReportReviewView.as_view(), name='report-review'),
    path('reports/<uuid:uuid>/delete/', views.ReportDeleteView.as_view(), name='report-delete'),
    path('summary/data/', views.SummaryDataView.as_view(), name='summary-data'),
]
