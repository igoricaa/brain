import uuid

from django.db import models
from django.db.models.functions import Now
from django.utils.translation import gettext_lazy as _

from django_countries.fields import CountryField


class State(models.Model):

    uuid = models.UUIDField(
        _("UUID"),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    country = CountryField(
        _("country"),
        blank=True,
        db_index=True,
        help_text=_("The country to which the state belongs."),
    )

    name = models.CharField(_("name"), max_length=255)

    code = models.SlugField(
        _("code"),
        max_length=50,
        blank=True,
        help_text=_("A unique short code for the state."),
    )

    description = models.TextField(
        _("description"),
        blank=True,
        help_text=_("A long-form description of the state."),
    )

    created_at = models.DateTimeField(
        "created at",
        auto_now_add=True,
        db_default=Now(),
        help_text=_("The database level timestamp of when the record was created."),
    )

    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
        null=True,
        blank=True,
        help_text=_("The database level timestamp of when the record was last modified."),
    )

    class Meta:
        verbose_name = _("State")
        verbose_name_plural = _("States")

    def __str__(self):
        return self.name


class City(models.Model):
    uuid = models.UUIDField(
        _("UUID"),
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    country = CountryField(
        _("country"),
        blank=True,
        db_index=True,
        help_text=_("The country to which the city belongs."),
    )

    state = models.ForeignKey(
        "State",
        related_name="cities",
        related_query_name="city",
        verbose_name=_("state"),
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        help_text=_("The state/region to which the city belongs."),
    )

    name = models.CharField(_("name"), max_length=255)

    code = models.SlugField(
        _("code"),
        max_length=50,
        blank=True,
        help_text=_("A unique short code for the city."),
    )

    description = models.TextField(
        _("description"),
        blank=True,
        help_text=_("A long-form description of the city."),
    )

    created_at = models.DateTimeField(
        "created at",
        auto_now_add=True,
        db_default=Now(),
        help_text=_("The database level timestamp of when the record was created."),
    )

    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
        null=True,
        blank=True,
        help_text=_("The database level timestamp of when the record was last modified."),
    )

    class Meta:
        verbose_name = _("City")
        verbose_name_plural = _("Cities")

    def __str__(self):
        return self.name
