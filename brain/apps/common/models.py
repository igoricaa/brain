from django.db import models
from django.utils.translation import gettext_lazy as _

__all__ = ['ProcessingStatus']


class ProcessingStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    STARTED = 'STARTED', _('Started processing')
    SUCCESS = 'SUCCESS', _('Successful')
    FAILURE = 'FAILURE', _('Failed')
    RETRY = 'RETRY', _('Retrying')
    REVOKED = 'REVOKED', _('Revoked')
