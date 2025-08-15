from urllib.parse import quote, urljoin

import requests

from .conf import settings

__all__ = ['UsptoAPI']


class UsptoAPI:
    """USPTO API client."""

    base_url = 'https://api.uspto.gov/api/v1/'

    def __init__(self, api_key=None, raise_for_status=False):
        self.api_key = api_key or settings.uspto_api_key
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        return urljoin(self.base_url, endpoint_name)

    def request(self, method, endpoint_name, **kwargs):
        url = self.get_endpoint_url(endpoint_name)

        headers = kwargs.pop('headers', {})
        headers['X-API-KEY'] = f'{self.api_key}'

        response = requests.request(method, url, headers=headers, **kwargs)
        if self.raise_for_status:
            response.raise_for_status()

        return response

    def get(self, endpoint_name, params=None, **kwargs):
        """Send GET request to the USPTO API"""
        response = self.request('get', endpoint_name, params=params, **kwargs)
        return response

    def post(self, endpoint_name, data=None, **kwargs):
        """Send POST request to the USPTO API"""
        data = data or {}
        data = {**data, **kwargs.get('json', {})}
        response = self.request('post', endpoint_name, json=data, **kwargs)
        return response

    def search_patents(self, q=None, *, company_name=None, city=None, state=None, state_code=None,
                       offset=0, limit=100, **kwargs):
        """https://data.uspto.gov/apis/patent-file-wrapper/search"""

        q = q or kwargs.get('q')
        if q:
            and_q = [q]
        else:
            and_q = []

        pagination = kwargs.pop('pagination', {})
        if not pagination:
            pagination['offset'] = offset
            pagination['limit'] = limit

        if company_name:
            and_q.append(f'applicationMetaData.applicantBag.applicantNameText: {quote(company_name)}')

        if state_code:
            and_q.append(
                f'applicationMetaData.applicantBag.correspondenceAddressBag'
                f'.geographicRegionCode: {state_code}'
            )
        elif state:
            and_q.append(
                f'applicationMetaData.applicantBag.correspondenceAddressBag.geographicRegionName: {state}'
            )

        if city:
            and_q.append(f'applicationMetaData.applicantBag.correspondenceAddressBag.cityName: {city}')

        kwargs['q'] = ' AND '.join(and_q)
        kwargs['pagination'] = pagination

        return self.post('patent/applications/search', data=kwargs)
