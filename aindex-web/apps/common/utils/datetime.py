from datetime import timedelta

from django.utils.timezone import now

__all__ = ['previous_week', 'previous_month_date_range']


def previous_week(date=None):
    """Returns a named tuple of ISO calendar date year, week and weekday.
    If the reference date is not specified the current dat is used.
    """
    if not date:
        date = now()
    return (date - timedelta(weeks=1)).isocalendar()


def previous_month_date_range(date=None):
    """Returns a tuple of first and last dates of the month.
    If the reference date is not specified the current dat is used.
    """
    if not date:
        date = now().date()

    last_date = date.replace(day=1) - timedelta(days=1)
    first_date = last_date.replace(day=1)

    return first_date, last_date
