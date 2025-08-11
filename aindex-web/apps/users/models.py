import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    uuid = models.UUIDField(
        _('UUID'),
        editable=False,
        unique=True,
        default=uuid.uuid4
    )

    @cached_property
    def display_name(self):
        if self.first_name:
            return self.first_name
        elif self.email:
            return self.email
        else:
            return self.username
