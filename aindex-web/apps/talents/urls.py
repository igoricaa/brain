from django.urls import path

from . import views

app_name = 'talents'

urlpatterns = [
    path('founders/<uuid:uuid>/create/', views.FounderCreateView.as_view(), name='founder-create'),
    path('founders/<uuid:uuid>/update/', views.FounderUpdateView.as_view(), name='founder-update'),
    path('founders/<uuid:uuid>/delete/', views.FounderDeleteView.as_view(), name='founder-delete'),
]
