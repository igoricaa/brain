import re
from pathlib import Path

__all__ = ['get_requests_filename']

from urllib.parse import urlparse


def get_requests_filename(response):
    """
    Extracts a filename from a requests Response object.

    It attempts to extract the filename from the 'Content-Disposition' header and
    if that is not successful, it tries to parse the URL path.

    Args:
        response (requests.Response):
            A requests.Response object.

    Returns (str):
        The extracted filename as a string, or empty string if no filename
        can be determined.
    """
    content_disposition = response.headers.get('content-disposition')

    if content_disposition:
        matches = re.findall("filename=(.+)", content_disposition)
        if matches:
            filename = matches[0]
            return filename

    filename = Path(urlparse(response.url).path).name
    return filename
