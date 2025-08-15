from datetime import datetime
from json import JSONDecodeError
from urllib.parse import urljoin

import requests
from requests.auth import HTTPBasicAuth

from .conf import settings

__all__ = ['AffinityAPI', 'AffinityError']


class AffinityError(Exception):

    def __init__(self, message=None, response=None):
        self.message = message
        self.response = response


class AffinityAPI:
    """
    Affinity API (V1) client.

    https://api-docs.affinity.co/#introduction
    """

    def __init__(self, api_key=None, raise_for_status=False):
        self.api_key = api_key or settings.affinity_api_key
        self.base_url = 'https://api.affinity.co/'
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        return urljoin(self.base_url, endpoint_name)

    def request(self, method, endpoint_name, set_content_type=True, **kwargs):
        url = self.get_endpoint_url(endpoint_name)
        basic_auth = HTTPBasicAuth(username='', password=self.api_key)

        headers = kwargs.pop('headers', {})
        if 'content-type' not in [h.lower() for h in headers.keys()] and set_content_type:
            headers['Content-Type'] = 'application/json'

        response = requests.request(method, url, auth=basic_auth, headers=headers, **kwargs)
        if self.raise_for_status:
            response.raise_for_status()

        try:
            return response.json()
        except JSONDecodeError:
            raise AffinityError(message='Failed to decode json', response=response)

    def get(self, endpoint_name, params=None, **kwargs):
        """Send GET request to the affinity API"""
        return self.request('get', endpoint_name, params=params, **kwargs)

    def post(self, endpoint_name, data=None, **kwargs):
        """Send POST request to the affinity API"""

        if 'files' not in kwargs and isinstance(data, dict):
            kwargs['json'] = data
        else:
            kwargs['data'] = data

        return self.request('post', endpoint_name, **kwargs)

    def put(self, endpoint_name, data=None, **kwargs):
        """Send PUT request to the affinity API"""

        if 'files' not in kwargs and isinstance(data, dict):
            kwargs['json'] = data
        else:
            kwargs['data'] = data

        return self.request('put', endpoint_name, **kwargs)

    def upload(self, endpoint_name, files=None, **kwargs):
        """Send POST Multipart request to the affinity API"""
        return self.post(endpoint_name, files=files, set_content_type=False, **kwargs)

    def search_organizations(self, term=None, with_interaction_dates=None, with_interaction_persons=None,
                             with_opportunities=None, page_size=500, page_token=None, **kwargs):
        """Search for an organization

        https://api-docs.affinity.co/#search-for-organizations
        """
        params = {
            'term': term,
            'with_interaction_dates': with_interaction_dates,
            'with_interaction_persons': with_interaction_persons,
            'with_opportunities': with_opportunities,
            'page_size': int(page_size),
            'page_token': page_token,
            **kwargs.pop('params', {})
        }
        return self.get('organizations', params=params, **kwargs)

    def get_organization(self, organization_id, **kwargs):
        """Get a specific organization.

        https://api-docs.affinity.co/#get-a-specific-organization
        """
        return self.get(f'{organization_id}/organizations', **kwargs)

    def create_list_entry(self, list_id, entity_id, creator_id=None, **kwargs):
        """Create a new list entry

        https://api-docs.affinity.co/#create-a-new-list-entry
        """
        data = {
            'entity_id': int(entity_id),
            'creator_id': int(creator_id) if creator_id else None,
            **kwargs.pop('data', {})
        }
        return self.post(f'lists/{list_id}/list-entries', data, **kwargs)

    def get_field_values(self, person_id=None, organization_id=None, opportunity_id=None, list_entry_id=None,
                         **kwargs):
        """Get field values

        https://api-docs.affinity.co/#get-field-values
        """
        params = {
            **kwargs.pop('params', {}),
            'person_id': person_id,
            'organization_id': organization_id,
            'opportunity_id': opportunity_id,
            'list_entry_id': list_entry_id
        }
        return self.get('field-values', params=params, **kwargs)

    def create_field_value(self, field_id, entity_id, value, list_entry_id=None, **kwargs):
        """Create a new field value

        https://api-docs.affinity.co/#create-a-new-field-value
        """
        data = {
            'field_id': int(field_id),
            'entity_id': int(entity_id),
            'value': value,
            'list_entry_id': int(list_entry_id) if list_entry_id else None,
            **kwargs.pop('data', {})
        }
        return self.post('field-values', data, **kwargs)

    def update_field_value(self, field_value_id, value, **kwargs):
        """Update field value

        https://api-docs.affinity.co/#update-a-field-value
        """
        data = {
            **kwargs.pop('data', {}),
            'value': value,
        }
        return self.put(f'field-values/{field_value_id}', data, **kwargs)

    def create_note(self, content, person_ids=None, organization_ids=None, opportunity_ids=None,
                    note_type=None, parent_id=None, creator_id=None, created_at=None, **kwargs):
        """Create a Note

        https://api-docs.affinity.co/#create-a-new-note
        """

        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()

        data = {
            'content': content,
            'person_ids': person_ids,
            'organization_ids': organization_ids,
            'opportunity_ids': opportunity_ids,
            'type': note_type,
            'parent_id': int(parent_id) if parent_id else None,
            'creator_id': int(creator_id) if parent_id else None,
            'created_at': created_at,
            **kwargs.pop('data', {})
        }

        return self.post('notes', data, **kwargs)

    def upload_entity_files(self, file=None, files=None, person_id=None, organization_id=None,
                            opportunity_id=None, **kwargs):
        """Uploads files attached to the entity with the given id.

        https://api-docs.affinity.co/#upload-files
        """

        if not file and not files:
            raise ValueError('Either file or files must be provided')

        data = {
            'person_id': person_id,
            'organization_id': organization_id,
            'opportunity_id': opportunity_id
        }

        uploads = {k: (None, v) for k, v in data.items() if v is not None}

        if file:
            uploads['file'] = file

        if files:
            uploads['files'] = files

        return self.upload('entity-files', files=uploads, **kwargs)
