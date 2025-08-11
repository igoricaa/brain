from django.conf import settings


def site(request):
    return {
        'SITE_NAME': settings.SITE_NAME,
        'SITE_API_NAME': settings.SITE_API_NAME,
        'GOOGLE_ANALYTICS_ID': settings.GOOGLE_ANALYTICS_ID,
        'GOOGLE_SITE_VERIFICATION': settings.GOOGLE_SITE_VERIFICATION
    }
