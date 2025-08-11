from google.oauth2 import service_account

from .conf import settings


def get_gcp_credentials():
    return service_account.Credentials.from_service_account_file(settings.google_application_credentials)
