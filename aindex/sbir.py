from urllib.parse import urljoin

import requests

__all__ = ['SbirAPI']


class SbirAPI:
    """SBIR API client.

    https://www.sbir.gov/api
    """

    AGENCY_LOOKUP = {
        'DOD': 'Department of Defense',
        'HHS': 'Department of Health and Human Services',
        'NASA': 'National Aeronautics and Space Administration',
        'NSF': 'National Science Foundation',
        'DOE': 'Department of Energy',
        'USDA': 'United States Dept. of Agriculture',
        'EPA': 'Environmental Protection Agency',
        'DOC': 'Department of Commerce',
        'ED': 'Department of Education',
        'DOT': 'Department of Transportation',
        'DHS': 'Department of Homeland Security'
    }

    def __init__(self, raise_for_status=True):
        self.base_url = 'https://api.www.sbir.gov/public/api/'
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        return urljoin(self.base_url, f'{endpoint_name}')

    def get(self, endpoint_name, raw_response=False, **kwargs):
        url = self.get_endpoint_url(endpoint_name)
        response = requests.get(url, **kwargs)
        if self.raise_for_status:
            response.raise_for_status()

        if raw_response is True:
            return response

        return response.json()

    def search_firms(self, name=None, *, uei=None, keyword=None, rows=100, start=None, sort=None, **kwargs):
        """Search companies.

        https://www.sbir.gov/api/company
        """

        params = {
            'name': name,
            'uei': uei,
            'keyword': keyword,
            'sort': sort,
            'rows':  rows,
            'start': start
        }

        return self.get('firm', params=params, **kwargs)

    def search_awards(self, firm=None, *, agency=None, year=None, research_institution=None,
                      rows=100, start=None, **kwargs):
        """Search awards.

        https://www.sbir.gov/api
        """

        if agency and agency not in self.AGENCY_LOOKUP:
            raise ValueError(
                f"Invalid agency value `{agency}`. Allowed values are {', '.join(self.AGENCY_LOOKUP.keys())}"
            )

        params = {
            'firm': firm,
            'agency': agency,
            'year': year,
            'ri': research_institution,
            'rows': rows,
            'start': start
        }

        return self.get('awards', params=params, **kwargs)
