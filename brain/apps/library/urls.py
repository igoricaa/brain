from django.urls import path
from . import views

app_name = 'library'

urlpatterns = [
    # Main library page
    path('', views.LibraryView.as_view(), name='library'),
    
    # Enhanced library page with FileManager
    path('new/', views.LibraryNewView.as_view(), name='library-new'),
    
    # API endpoints
    path('stats/', views.library_stats, name='stats'),
]