from django.urls import path

from . import views

app_name = 'companies'

urlpatterns = [
    path('<uuid:uuid>/', views.CompanyDetailView.as_view(), name='company-detail'),
    path('<uuid:uuid>/add-grant/', views.GrantCreateView.as_view(), name='company-create-grant'),
    path('grants/<uuid:uuid>/update/', views.GrantUpdateView.as_view(), name='grant-update'),
    path('grants/<uuid:uuid>/delete/', views.GrantDeleteView.as_view(), name='grant-delete'),
    path(
        '<uuid:uuid>/add-patent-application/',
        views.PatentApplicationCreateView.as_view(),
        name='company-create-patent-application',
    ),
    path(
        'patent-applications/<uuid:uuid>/update/',
        views.PatentApplicationUpdateView.as_view(),
        name='patent-application-update',
    ),
    path(
        'patent-applications/<uuid:uuid>/delete/',
        views.PatentApplicationDeleteView.as_view(),
        name='patent-application-delete',
    ),
    path(
        '<uuid:uuid>/delete-patent-applications/',
        views.PatentApplicationBulkDeleteView.as_view(),
        name='company-delete-patent-applications',
    ),
]
