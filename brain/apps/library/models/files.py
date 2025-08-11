import hashlib
import mimetypes
import uuid
from pathlib import Path

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.core.files import File as FileProxy
from django.core.files.temp import NamedTemporaryFile
from django.db import models, transaction
from django.db.models.functions import Now
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import requests
from polymorphic.models import PolymorphicModel

from aindex.utils import get_requests_filename

from common.models import ProcessingStatus

from ..storage import default_file_path, library_file_storage
from ..tasks import download_file_src

__all__ = ['File', 'mimetype_validator']


def mimetype_validator(value):
    if not mimetypes.guess_extension(value):
        msg = "'{mimetype}' is not a recognized MIME-Type."
        raise ValidationError(msg.format(mimetype=value))


class File(PolymorphicModel):
    """File"""

    uuid = models.UUIDField(_('UUID'), default=uuid.uuid4, editable=False, unique=True)

    source = models.ForeignKey(
        'library.Source',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='document',
        related_query_name='documents',
        verbose_name=_('source'),
    )

    categories = models.ManyToManyField(
        'library.Category',
        blank=True,
        related_name='document',
        related_query_name='documents',
        verbose_name=_('categories'),
    )

    file = models.FileField(
        _('file'),
        storage=library_file_storage,
        upload_to=default_file_path,
        max_length=255,
        blank=True,
    )

    mime_type = models.CharField(
        blank=True,
        max_length=255,
        help_text="MIME type of uploaded content",
        validators=[mimetype_validator],
        default='application/octet-stream',
    )

    src_id = models.CharField(_('external ID'), max_length=255, blank=True)
    src_url = models.URLField(_('external URL'), blank=True)
    src_download_url = models.URLField(_('external download URL'), blank=True, max_length=2048)

    tags = ArrayField(models.CharField(max_length=255), default=list, blank=True, verbose_name=_('tags'))

    is_deleted = models.BooleanField(_('is deleted'), blank=True, null=True, default=False)

    extras = models.JSONField(_('extras'), blank=True, default=dict)

    processing_status = models.CharField(
        _('processing status'),
        choices=ProcessingStatus,
        max_length=255,
        blank=True,
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_library_files',
        related_query_name='created_library_file',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('creator'),
    )

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

    class Meta:
        verbose_name = _('File')
        verbose_name_plural = _('Files')

    def __str__(self):
        return self.file_name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        post_save_tasks = self.get_post_save_tasks()
        if post_save_tasks:
            transaction.on_commit(lambda: post_save_tasks.delay())

    @property
    def file_name(self):
        if not self.file:
            return ''

        return Path(self.file.name).name

    def save_src_file(self):
        """Download and save file from an external url.

        Returns: str
            Link to the saved file.
        """

        if not self.src_download_url:
            return None

        r = requests.get(self.src_download_url, stream=True)

        with NamedTemporaryFile('wb+', delete=True) as f:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
            f.seek(0)

            file_name = get_requests_filename(r) or '%s.pdf' % (
                hashlib.md5(self.src_download_url.encode('utf-8')).hexdigest(),
            )

            _file = FileProxy(f)
            self.file.save(file_name, _file, save=False)

        self.__class__.objects.filter(pk=self.pk).update(file=self.file, updated_at=now())
        return self.file.url

    def get_post_save_tasks(self):
        if not self.file and self.src_download_url:
            return download_file_src.si(pk=self.pk)
        return None
