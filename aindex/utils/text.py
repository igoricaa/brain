import re

__all__ = ['is_gcs_uri', 'parse_arxiv_paper_url', 'ordinal']


def is_gcs_uri(src):
    """Returns True is the given string looks like GCS URI"""
    return str(src).lower().startswith('gs://')


def parse_arxiv_paper_url(url):
    """
    Parses an arXiv ID and version from a given arXiv URL.

    Args:
        url (str):
            The URL of the arXiv page (e.g., 'https://arxiv.org/abs/2301.01234',
             'https://arxiv.org/pdf/2301.01234v1').

    Returns (dict):
        A dictionary containing the extracted arXiv ID as a string, and versions if available. Returns
        None if no match is found.
    """

    patterns = [
        r'https?://(?:www.)?arxiv.org/(?:abs|pdf)/(?P<id>[\d,.]+)(?P<version>[\d,v]+)?',
        r'https?://(?:www.)?arxiv.org/(?:abs|pdf)/(?P<id>[a-z\-\.]+\/\d{7})(?P<version>v\d+)?',
    ]

    for pattern in patterns:
        regex = re.compile(pattern)
        match = regex.match(url)
        if match:
            parsed = match.groupdict()
            if 'version' not in parsed:
                parsed['version'] = None
            return parsed

    return None


def ordinal(n):
    """
    Returns the ordinal representation of a number (e.g., 1st, 2nd, 3rd, 4th).
    """

    if not n:
        return ''

    n = int(n)

    if 11 <= (n % 100) <= 13:  # Special case for 11th, 12th, 13th
        suffix = 'th'
    else:
        last_digit = n % 10
        if last_digit == 1:
            suffix = 'st'
        elif last_digit == 2:
            suffix = 'nd'
        elif last_digit == 3:
            suffix = 'rd'
        else:
            suffix = 'th'
    return f'{n}{suffix}'
