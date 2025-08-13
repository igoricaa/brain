import hashlib
import mimetypes
import uuid
from pathlib import Path

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.core.files import File as FileProxy
from django.core.files.storage import FileSystemStorage
from django.core.files.temp import NamedTemporaryFile
from django.db import models, transaction
from django.db.models.functions import Now
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

import requests
from polymorphic.managers import PolymorphicManager
from polymorphic.models import PolymorphicModel

from aindex.parsers import get_pdf_parser_class
from aindex.utils import get_requests_filename

from common.models import ProcessingStatus

from ..storage import default_file_path, library_file_storage
from ..tasks import download_file_src

__all__ = ['File', 'mimetype_validator']


def mimetype_validator(value):
    if not mimetypes.guess_extension(value):
        msg = "'{mimetype}' is not a recognized MIME-Type."
        raise ValidationError(msg.format(mimetype=value))


class FileManager(PolymorphicManager):

    def convert(self, src, defaults=None):
        """Change the baseclass or subclass model instance into a new model instance.

        Optionally ``defaults`` could be as dictionary of (field, value) pairs which should be used
        as default values to be used in the converted instance.
        """

        # copy attributes
        attrs = defaults or {}
        field_names = [f.name for f in self.model._meta.fields]
        for field in src._meta.fields:
            if field.name in field_names and field.name not in ['polymorphic_ctype', 'file_ptr']:
                attrs[field.name] = getattr(src, field.name)

        with transaction.atomic():

            # delete old object
            src.delete()

            # create a new object
            obj = self.model(**attrs)
            obj.pk = None
            obj.id = None
            obj.save()

        return obj


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

    objects = FileManager()

    class Meta:
        verbose_name = _('File')
        verbose_name_plural = _('Files')

    def __str__(self):
        return self.file_name

    def save(self, *args, **kwargs):

        if self.file and not self.mime_type:
            self.mime_type = self.guess_mime_type() or ''

        super().save(*args, **kwargs)

        post_save_tasks = self.get_post_save_tasks()
        if post_save_tasks:
            transaction.on_commit(lambda: post_save_tasks.delay())

    @property
    def file_name(self):
        if not self.file:
            return ''

        return Path(self.file.name).name

    def guess_mime_type(self):
        if not self.file:
            return None
        _mime_type, _encoding = mimetypes.guess_type(self.file_name)

        return _mime_type

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

    @property
    def pdf_parser(self):
        parser_class = get_pdf_parser_class()

        if isinstance(self.file.storage, FileSystemStorage):
            path = Path(self.file.path)
        else:
            # GCS
            path = f'gs://{self.file.storage.bucket_name}/{self.file.file.name}'

        parser = parser_class(path)
        return parser

    def extract_pdf_text(self, parser=None):
        """Extract text from PDF

        Returns
            str:
                Extracted text
        """
        if not self.file:
            raise ValueError(_('The paper has no file'))

        parser = parser or self.pdf_parser
        text = self._sanitize_text(parser.extract_text())
        return text

    @staticmethod
    def _sanitize_text(text):
        text = text or ''

        # Avoid "psycopg.DataError: PostgreSQL text fields cannot contain NUL (0x00) bytes"
        text = text.replace('\x00', '')

        return text
