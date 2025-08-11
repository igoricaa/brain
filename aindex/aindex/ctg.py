from urllib.parse import urljoin

import requests

__all__ = ['CtgAPI']


class CtgAPI:
    """ClinicalTrials.gov API client.

    https://clinicaltrials.gov/data-api/api
    """

    def __init__(self, raise_for_status=False):
        self.base_url = 'https://clinicaltrials.gov/api/v2/'
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        return urljoin(self.base_url, endpoint_name)

    def get(self, endpoint_name, **kwargs):
        url = self.get_endpoint_url(endpoint_name)
        response = requests.get(url, **kwargs)

        if self.raise_for_status:
            response.raise_for_status()

        return response.json()

    def get_studies(self, params=None, fields=None, page_size=10, count_total=False,
                    page_token=None, **kwargs):
        """Returns data of studies matching query and filter parameters.

        Args:
            params (dict):
                A dictionary containing query and filter parameters.

            fields (list):
                If specified, must be non-empty list of fields to return.
                If unspecified, all fields will be returned. Order of the fields does not matter.

            page_size (int):
                Page size is maximum number of studies to return in response.
                It does not have to be the same for every page.
                If not specified or set to 0, the default value will be used.
                It will be coerced down to 1,000, if greater than that.

            page_token (str):
                Token to get next page.
                Set it to a nextPageToken value returned with the previous page in JSON format.
                For CSV, it can be found in x-next-page-token response header.
                Do not specify it for first page.

            count_total (bool):
                Count total number of studies in all pages and return totalCount field with first page,
                if true. For CSV, the result can be found in x-total-count response header.
                The parameter is ignored for the subsequent pages.

        Returns:
            dict
        """
        params = params or {}

        if fields:
            params['fields'] = ','.join(fields)

        params['pageSize'] = page_size
        params['pageToken'] = page_token

        if count_total is True:
            params['countTotal'] = 'true'
        else:
            params['countTotal'] = 'false'

        return self.get('studies', params=params, **kwargs)
