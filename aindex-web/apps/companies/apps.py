from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CompaniesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'companies'
    verbose_name = _('companies')

    def ready(self):
        from .api.openapi import schema  # noqa: F401
