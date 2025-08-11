import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Now
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

__all__ = ['Category', 'Source']

EMBEDDING_DIMENSIONS = settings.LIBRARAIN_EMBEDDING_DIMENSIONS


class Category(models.Model):
    """File category"""

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

    updated_at = models.DateTimeField(_('updated at'), auto_now=True, null=True, blank=True)

    extras = models.JSONField(_('extras'), blank=True, default=dict)

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')

    def __str__(self):
        return self.name


class Source(models.Model):
    """File Source"""

    uuid = models.UUIDField(_('UUID'), default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(_('name'), max_length=255)
    code = models.SlugField('code', max_length=50, blank=True, null=False, unique=True)
    website = models.URLField(_('website URL'), blank=True)
    description = models.TextField(_('description'), blank=True)

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
    extras = models.JSONField(_('extras'), blank=True, default=dict)

    class Meta:
        verbose_name = _('Source')
        verbose_name_plural = _('Sources')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.code = self.code or str(self.uuid)
        super().save(*args, **kwargs)

    @cached_property
    def image_url(self):
        if not self.image:
            return None
        return self.image.url

    @cached_property
    def image_small_url(self):
        if not self.image:
            return None
        return self.image_small.url

    @cached_property
    def image_medium_url(self):
        if not self.image:
            return None
        return self.image_medium.url

    @cached_property
    def image_large_url(self):
        if not self.image:
            return None
        return self.image_large.url
