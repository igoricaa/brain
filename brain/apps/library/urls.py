from django.urls import path
from . import views

app_name = 'library'

urlpatterns = [
    # Main library page
    path('', views.LibraryView.as_view(), name='library'),
    
    # API endpoints
    path('stats/', views.library_stats, name='stats'),
]