import logging
from urllib.parse import urljoin

import requests

from ..conf import settings
from .base import (ORG_BASIC_FIELDS, ORG_SEARCH_BASIC_ORDER, ORG_SEARCH_BASIC_QUERY, ORG_SEARCH_DEFAULT_LIMIT,
                   ORG_SEARCH_ENDPOINT_NAME)

__all__ = ['CrunchbaseAPI']


logger = logging.getLogger(__name__)


class CrunchbaseAPI:
    """
    A client for interacting with the Crunchbase API (V4).

    Attributes:
        api_key (str):
            The API key for authenticating requests to the Crunchbase API.

        base_url (str):
            The base URL for the Crunchbase API.

        raise_for_status (bool):
            Whether to raise an exception for HTTP errors.
    """

    def __init__(self, api_key=None, raise_for_status=True):
        """
        Initializes the Crunchbase API client.

        Args:
            api_key (Optional[str]):
                The API key for Crunchbase. If not provided, it will be loaded
                from the settings.

            raise_for_status (bool):
                If True, an HTTP error will raise an exception.
        """
        self.api_key = api_key or settings.crunchbase_api_key
        self.base_url = 'https://api.crunchbase.com/v4/'
        self.raise_for_status = raise_for_status

    def get_endpoint_url(self, endpoint_name):
        """
        Constructs the full URL for a given Crunchbase API endpoint.

        Args:
            endpoint_name (str):
                The specific endpoint path to be appended to the base URL.

        Returns:
            str: The full URL for the specified endpoint.
        """
        return urljoin(self.base_url, endpoint_name)

    def request(self, method, endpoint_name, **kwargs):
        """
        Sends an HTTP request to a specified Crunchbase API endpoint.

        Args:
            method (str):
                The HTTP method (e.g., 'get', 'post', etc.) to use for the
                request.

            endpoint_name (str):
                The specific endpoint path to send the request to.

            **kwargs (Dict[str, Optional[Any]]):
                Additional arguments passed to the `requests.request` method,
                such as headers, params, and data.

        Returns:
            requests.Response: The HTTP response received from the API.

        Raises:
            requests.HTTPError: If `raise_for_status` is True and the HTTP
            request returns an error status code.
        """
        url = self.get_endpoint_url(endpoint_name)

        # Prepare headers with API key and content types
        headers = kwargs.pop('headers', {})
        headers['X-cb-user-key'] = self.api_key
        headers['content-type'] = 'application/json'
        headers['accept'] = 'application/json'

        # Send the request
        response = requests.request(method, url, headers=headers, **kwargs)
        if self.raise_for_status:
            response.raise_for_status()

        return response

    def get(self, endpoint_name, params=None, **kwargs):
        """
        Sends a GET request to the Crunchbase API.

        Args:
            endpoint_name (str):
                The specific endpoint path to send the request to.

            params (Optional[Dict[str, Any]]):
                Query parameters to include in the request.

            **kwargs (Dict[str, Optional[Any]]):
                Additional arguments passed to the `request` method.

        Returns:
            Dict[str, Optional[Any]]: The parsed JSON response from the API.
        """
        response = self.request('get', endpoint_name, params=params, **kwargs)
        return response.json()

    def post(self, endpoint_name, data=None, **kwargs):
        """
        Sends a POST request to the Crunchbase API.

        Args:
            endpoint_name (str):
                The specific endpoint path to send the request to.

            data (Optional[Dict[str, Any]]):
                The JSON payload to include in the request body.

            **kwargs (Dict[str, Optional[Any]]):
                Additional arguments passed to the `request` method, including
                any extra JSON data under the `json` key.

        Returns:
            Dict[str, Optional[Any]]: The parsed JSON response from the API.
        """
        data = data or {}
        data = {**data, **kwargs.get('json', {})}
        response = self.request('post', endpoint_name, json=data, **kwargs)
        return response.json()

    def search_organizations(self, query=None, max_size=None, **kwargs):
        """
        Search organizations from the Crunchbase API with automatic pagination.

        It continuously fetches and yields organizations from the Crunchbase
        API, handling pagination by updating the `after_id` with the last
        entity's UUID in each batch. It stops when either the maximum number
        of organizations (`max_size`) is reached or when there are no more
        results to fetch.

        Args:
            max_size (Optional[int]):
                The maximum number of organizations to fetch. If `None`,
                fetch all available organizations. Defaults to `None`.

            **kwargs (Dict[str, Optional[Any]]):
                Additional keyword arguments that are used to customize the
                search and also passed to the request method.

        Yields:
            Dict[str, Optional[Any]]:
                Raw organization data as dictionaries.

        Raises:
            requests.HTTPError: If `raise_for_status` is True and the HTTP
            request returns an error status code.
        """

        total_fetched = 0  # Track the total number of organizations fetched

        # Continuously fetches and yields organizations
        while True:

            # Retrieve a batch of organizations results,
            # If no results are returned, exit the loop
            results = self._search_organizations(query=query, **kwargs)
            if not results:
                break

            # Extract the list of organization entities from the results,
            # If no results are returned, exit the loop
            entities = results.get('entities')
            if not entities:
                break

            # Parse and yield each entity in the current batch
            for entity in entities:
                yield entity

            # Increment total fetched organizations and log the progress
            total_fetched += len(entities)
            logger.info(f'Fetched {total_fetched} organizations.')

            # Update the `after_id` pagination cursor with the last
            # organization entity's UUID.
            # If is the last batch, exit the loop
            last_entity = entities[-1]
            after_id = last_entity.get('uuid')
            if not after_id:
                break
            kwargs = {**kwargs, **{'after_id': after_id}}

            # If the `total_fetched` organization reaches the
            # specified `max_size`, exit
            if max_size and total_fetched >= max_size:
                break

    def get_organization(self, entity_id, field_ids=None, card_ids=None, **kwargs):
        """
        Retrieve data fields for a specific organization.
        https://data.crunchbase.com/reference/get_data-entities-organizations-entity-id

        Args:
            entity_id (str):
                UUID or permalink of desired entity

            field_ids (Optional[List[str]]):
                Fields to include on the resulting entity. Defaults to
                `ORG_BASIC_FIELDS`.

            card_ids (Optional[List[str]]):
                Cards to include on the resulting entity. These may include
                child_organizations, child_ownerships, event_appearances, fields,
                founders, headquarters_address, parent_organization and parent_ownership

            **kwargs (Dict):
                Additional keyword arguments that are passed to the requests.get method.

        Returns
            Dict:
                Matched organization data

        Raises:
            requests.HTTPError: If `raise_for_status` is True and the HTTP
            request returns an error status code.
        """
        field_ids = field_ids or ORG_BASIC_FIELDS
        card_ids = ','.join(card_ids) if card_ids else card_ids

        return self.get(
            f'data/entities/organizations/{entity_id}',
            params={
                'field_ids': ','.join(field_ids),
                'card_ids': card_ids
            },
            **kwargs
        )

    def _search_organizations(self, query=None, after_id=None, field_ids=None, limit=None, **kwargs):
        """
        Search for organizations from the Crunchbase API.

        It constructs and sends a search request to the Crunchbase API's
        organization search endpoint. It allows for pagination using `after_id`
        and supports specifying `field_ids`, `limit`, `order` and `query`
        parameters.

        Args:
            after_id (Optional[str]):
                The last organization's UUID to paginate after (used for
                fetching the next page). Defaults to `None`.

            field_ids (Optional[List[str]]):
                A list of field IDs to include in the response. Defaults to
                `ORG_BASIC_FIELDS`.

            limit (Optional[int]):
                The number of results to return. Defaults to
                `ORG_SEARCH_DEFAULT_LIMIT`.

            **kwargs (Dict[str, Optional[Any]]):
                Additional keyword arguments that are passed to the request method.

        Returns:
            List[Dict[str, Optional[Any]]]:
                The API response from the Crunchbase organization search endpoint.

        Raises:
            requests.HTTPError: If `raise_for_status` is True and the HTTP
            request returns an error status code.
        """

        # Prepare organizations search payload
        field_ids = list(set(field_ids or [*ORG_BASIC_FIELDS]))
        limit = limit or ORG_SEARCH_DEFAULT_LIMIT
        order = [*ORG_SEARCH_BASIC_ORDER]
        query = query or [*ORG_SEARCH_BASIC_QUERY]
        data = {
            'after_id': after_id,
            'field_ids': field_ids,
            'limit': limit,
            'order': order,
            'query': query,
            'collection_id': 'organization.companies',
        }
        data = {k: v for k, v in data.items() if v}

        # Search organizations and return the response
        response = self.post(ORG_SEARCH_ENDPOINT_NAME, data=data, **kwargs)
        return response
