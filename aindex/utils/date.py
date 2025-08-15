from datetime import datetime

__all__ = ['standardize_partial_date_str']


def standardize_partial_date_str(date_string):
    formats = {
        '%B %Y': '%Y-%m',
        '%b %Y': '%Y-%m',
        '%d %B %Y': '%Y-%m-%d',
        '%d %b %Y': '%Y-%m-%d',
    }

    for input_format, output_format in formats.items():
        try:
            return datetime.strptime(date_string, input_format).strftime(output_format)
        except ValueError:
            pass

    return date_string
