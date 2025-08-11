from urllib.parse import urlparse

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter(is_safe=True)
def intword_usd(value):

    try:
        value = int(value)
    except (TypeError, ValueError):
        return value

    prefix = '$'

    if value < 1000:
        suffix = ''
        display_value = value
    elif value < 500_000:
        suffix = 'K'
        display_value = round(value / 1000)
    else:
        suffix = 'M'
        display_value = round((value / 1000_000), 2)

    return mark_safe(
        f'<span class="prefix">{prefix}</span>'
        f'<span class="value">{display_value:g}</span>'
        f'<span class="suffix">{suffix}</span>'
    )


@register.filter
def url_display(value):
    try:
        url = urlparse(value)
        return url.netloc + url.path
    except ValueError:
        return value
