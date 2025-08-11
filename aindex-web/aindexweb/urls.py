"""
URL configuration for aindexweb project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from .api_urls import router as api_router

urlpatterns = [
    path('', RedirectView.as_view(pattern_name='deals:deal-list-fresh'), name='home'),
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('companies/', include('companies.urls')),
    path('talents/', include('talents.urls')),
    path('deals/', include('deals.urls')),
    path('dual-use/', include('dual_use.urls')),
    path("api/oauth/", include('oauth2_provider.urls', namespace='oauth2_provider')),
    path("api/", include((api_router.urls, 'api'))),
    path("openapi/schema/", SpectacularAPIView.as_view(), name="openapi-schema"),
    path("openapi/docs/", SpectacularRedocView.as_view(url_name="openapi-schema"), name="openapi-docs"),
    path("openapi/swagger-ui/", SpectacularSwaggerView.as_view(url_name="openapi-schema"), name="openapi-swagger-ui"),
]


if settings.DEBUG:

    urlpatterns = [
        path("__debug__/", include("debug_toolbar.urls")),

    ] + urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


admin.site.site_header = getattr(settings, 'ADMIN_SITE_HEADER', '')
admin.site.index_title = getattr(settings, 'ADMIN_INDEX_TITLE', '')
admin.site.site_title = getattr(settings, 'ADMIN_SITE_NAME', '')
