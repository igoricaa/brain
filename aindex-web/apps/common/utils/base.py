from decimal import Decimal

from django.db.backends.postgresql.psycopg_any import NumericRange

__all__ = ['as_int_range', 'as_decimal_range']


def as_int_range(lower=None, upper=None, bounds='[)', empty=False):
    if lower is not None:
        lower = int(lower)

    if upper is not None:
        upper = int(upper)

    return NumericRange(lower, upper, bounds, empty=empty)


def as_decimal_range(lower=None, upper=None, bounds='[)', empty=False):
    if lower is not None:
        lower = Decimal(float(lower))

    if upper is not None:
        upper = Decimal(float(upper))

    return NumericRange(lower, upper, bounds, empty=empty)
