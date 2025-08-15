import json
import logging
from urllib.parse import urljoin

import requests

from .conf import settings

__all__ = ['CoresignalAPI']

logger = logging.getLogger(__name__)


class CoresignalError(Exception):

    def __init__(self, message=None, response=None):
        self.message = message
        self.response = response


class CoresignalAPI:
    """
    Coresignal API (V1) client.
    """

    def __init__(self, api_key=None, raise_for_status=False):
        self.api_key = api_key or settings.coresignal_api_key
        self.base_url = 'https://api.coresignal.com/cdapi/v2/'
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        return urljoin(self.base_url, endpoint_name)

    def request(self, method, endpoint_name, **kwargs):
        url = self.get_endpoint_url(endpoint_name)

        headers = kwargs.pop('headers', {})
        headers['apikey'] = self.api_key
        headers['Content-Type'] = 'application/json'

        response = requests.request(method, url, headers=headers, **kwargs)
        if self.raise_for_status:
            response.raise_for_status()

        try:
            return response.json()
        except json.JSONDecodeError:
            raise CoresignalError(message='Failed to decode json', response=response)

    def get(self, endpoint_name, params=None, **kwargs):
        """Send GET request to the coresignal API"""
        return self.request('get', endpoint_name, params=params, **kwargs)

    def post(self, endpoint_name, data=None, **kwargs):
        """Send POST request to the coresignal API"""
        data = data or {}
        data = {**data, **kwargs.get('json', {})}
        return self.request('post', endpoint_name, json=data, **kwargs)

    def search_members(self, **kwargs):
        """Search for members matching the query

        Filtering parameters (Kwargs) schema:

        ::
            {
                "name": "string",
                "title": "string",
                "location": "string",
                "industry": "string",
                "summary": "string",
                "created_at_gte": "string",
                "created_at_lte": "string",
                "last_updated_gte": "string",
                "last_updated_lte": "string",
                "deleted": true,
                "country": "string",
                "skill": "string",
                "certification_name": "string",
                "experience_title": "string",
                "experience_company_name": "string",
                "experience_company_exact_name": "string",
                "experience_company_website_url": "string",
                "experience_company_website_exact_url": "string",
                "experience_company_linkedin_url": "string",
                "experience_company_industry": "string",
                "experience_company_size": "string",
                "experience_company_employees_count_gte": 0,
                "experience_company_employees_count_lte": 0,
                "experience_date_from": "string",
                "experience_date_to": "string",
                "experience_description": "string",
                "experience_deleted": true,
                "experience_company_id": 0,
                "active_experience": true,
                "keyword": "string",
                "education_institution_name": "string",
                "education_institution_exact_name": "string",
                "education_program_name": "string",
                "education_description": "string",
                "education_date_from": "string",
                "education_date_to": "string",
                "education_institution_linkedin_url": "string"
            }
        """

        return self.post('employee_base/search/filter', data=kwargs)

    def get_member(self, member_id):
        """Get profile details for a member with specified ID."""
        return self.get(f'employee_base/collect/{member_id}')

    def search_member(self, **kwargs):
        """Get the details of the member best matching the query."""
        matched = self.search_members(**kwargs)

        if not isinstance(matched, list) and not self.raise_for_status:
            raise CoresignalError(
                f'Unexpected response from {self.__class__.__name__}.search_members(). '
                f'Response data: {str(matched)}'
            )

        return self.get_member(matched[0])

    def search_companies(self, **kwargs):
        """Search for companies matching the query

        Filtering parameters (kwargs) schema:

        ::
            {
                "name": "string",
                "website": "string",
                "exact_website": "string",
                "size": "string",
                "industry": "string",
                "country": "string",
                "created_at_gte": "string",
                "created_at_lte": "string",
                "last_updated_gte": "string",
                "last_updated_lte": "string",
                "employees_count_gte": 0,
                "employees_count_lte": 0,
                "source_id": 0,
                "founded_year_gte": 0,
                "founded_year_lte": 0,
                "funding_total_rounds_count_gte": 0,
                "funding_total_rounds_count_lte": 0,
                "funding_last_round_type": "string",
                "funding_last_round_date_gte": "string",
                "funding_last_round_date_lte": "string"
            }
        """

        return self.post('company_base/search/filter', data=kwargs)

    def get_company(self, company_id):
        """Get profile details for a company with specified ID."""
        return self.get(f'company_base/collect/{company_id}')

    def search_company(self, **kwargs):
        """Get the details of the company best matching the query."""
        matched = self.search_companies(**kwargs)
        if matched:
            return self.get_company(matched[0])
