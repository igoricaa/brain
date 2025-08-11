import uuid

from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

__all__ = ['DocumentType']


class DocumentType(models.Model):
    """Document Type"""

    uuid = models.UUIDField(
        _('UUID'),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    code = models.SlugField('code', max_length=50, blank=True, null=False, unique=True)

    created_at = models.DateTimeField(
        'created at',
        auto_now_add=True,
        db_default=Now(),
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True,
        null=True,
        blank=True,
    )

    extras = models.JSONField(
        _('extras'),
        blank=True,
        default=dict,
    )

    class Meta:
        verbose_name = _('Document Type')
        verbose_name_plural = _('Document Types')

    def __str__(self):
        return self.name
