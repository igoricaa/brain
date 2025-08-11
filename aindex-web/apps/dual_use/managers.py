import datetime
import logging
from itertools import chain

from django.db import models
from django.utils import timezone

from aindex.crunchbase import CrunchbaseAPI, parse_crunchbase_organization
from aindex.utils import get_country

logger = logging.getLogger(__name__)


class ReportManager(models.Manager):

    def bulk_create_or_update(self, data, batch_size=1000, update_fields=None, unique_fields=None):
        """
        Bulk creates or updates instances in the database.

        It processes data in batches to efficiently create or update
        `Company` instances in the database. It processes the data in chunks
        of a specified size and commits them in larger batches to optimize
        database performance.

        Args:
            data (Iterable[Dict[str, Any]]):
                An iterable of dictionaries where each dictionary represents a
                `Company` instance's data. Each dictionary should have the keys
                specified in `unique_fields` if the record is to be updated.

            batch_size (int):
                The number of records to process per batch.

            update_fields (Optional[List[str]]):
                A list of fields that should be updated on conflict. If not
                provided, all fields except those in `unique_fields` will be
                updated.

            unique_fields (Optional[List[str]]):
                A list of fields used to identify existing records. These
                fields should be unique within the `Company` model. Defaults
                to the models primary key field.

        Yields:
            instances that were saved.

        See Also:
            Django `bulk_create` method:
            https://docs.djangoproject.com/en/5.1/ref/models/querysets/#django.db.models.query.QuerySet.bulk_create

            Django `bulk_update` method:
            https://docs.djangoproject.com/en/5.1/ref/models/querysets/#django.db.models.query.QuerySet.bulk_update
        """

        # Use the primary key field as a default unique field if not provided
        _unique_fields = list(set(unique_fields if unique_fields else [self.model._meta.pk.name]))

        if not update_fields:
            first_record = next(data)
            update_fields = first_record.keys()
            data = chain([first_record], data)  # restack the first record

        # Exclude the unique fields from update fields
        _update_fields = [field for field in update_fields if field not in _unique_fields]

        # Perform bulk create or update companies
        _data = (self.model(**item) for item in data)
        yield from self.bulk_create(
            _data,
            batch_size=batch_size,
            update_conflicts=True,
            update_fields=_update_fields,
            unique_fields=_unique_fields
        )

    def pull_crunchbase_data(self, batch_size=100, **kwargs):
        """
        Pull company data from the Crunchbase API and upsert it into the database.

        It retrieves company data from the Crunchbase API in batches
        and then inserts or updates the records in the database. The operation
        is performed in chunks to optimize memory usage and database
        transactions.

        Args:
            batch_size (int):
                The number of records to process per batch. Defaults to `100`.

            **kwargs (Dict[str, Optional[Any]]):
                Additional parameters passed to the Crunchbase API's search
                functionality and the bulk create or update method.

        Yields:
            instances that were saved.

        Raises:
            requests.HTTPError:
                Raised if the HTTP request fails with a status code indicating
                an error.
        """

        # Retrieve the company data from the Crunchbase API
        companies = self._pull_crunchbase_data(**kwargs)

        # Insert or update the companies in the database.
        yield from self.bulk_create_or_update(
            companies,
            unique_fields=['cb_uuid'],
            batch_size=batch_size
        )

    @classmethod
    def _pull_crunchbase_data(cls, api_key=None, limit=100, **kwargs):
        """
        Pull company data from the Crunchbase API.

        It interacts with the Crunchbase API to retrieve organization data,
        parse the relevant fields, and yield each company as a dictionary.

        Args:
            api_key (Optional[str]):
                The API key for Crunchbase. If not provided, it will be loaded
                from the settings.

            limit (Optional[int]):
                The number of results to return from Crunchbase.

            **kwargs (Dict[str, Optional[Any]]):
                Additional parameters passed to the Crunchbase API's search
                functionality.

        Yields:
            Dict[str, Optional[Any]]:
                Parsed company data as dictionaries, with fields like 'name',
                'cb_uuid', 'description', etc.

        Raises:
            requests.HTTPError:
                Raised if the HTTP request fails with a status code indicating
                an error.
        """

        # Initialize the Crunchbase API client
        crunchbase = CrunchbaseAPI(api_key=api_key)

        # Fetch the latest Crunchbase company's UUID to resume from, if applicable
        resume = kwargs.pop('resume', False)
        latest_cb_company = None
        if resume:
            try:
                latest_cb_company = cls.objects.filter(
                    cb_uuid__isnull=False,
                ).latest('updated_at')
            except cls.DoesNotExist:
                latest_cb_company = None
        if latest_cb_company and latest_cb_company.cb_uuid:
            latest_cb_uuid = str(latest_cb_company.cb_uuid)
            kwargs = {**kwargs, **{'after_id': latest_cb_uuid}}
            logger.info(f'Resuming from Crunchbase organization UUID: {latest_cb_uuid}.')

        # Search for organizations from the Crunchbase API
        data = crunchbase.search_organizations(limit=limit, **kwargs)

        # Iterate, parse and transform Crunchbase organizations to companies.
        for item in data:

            # Parse crunchbase organization
            item = parse_crunchbase_organization(item)

            # Extract HQ country code (ISO Alpha-2), if available
            hq_country = item.get('locations', {}).get('country')
            hq_country = get_country(hq_country)
            hq_country = hq_country.alpha_2 if hq_country else None

            # Build the company dictionary
            company_data = {
               'name': item.pop('name', None),
               'cb_uuid': item.pop('uuid', None),
               'summary': item.pop('short_description', None),
               'website': item.pop('website_url', None),
               'cb_url': item.pop('crunchbase_url', None),
               'linkedin_url': item.pop('linkedin_url', None),
               'hq_country': hq_country,
               'hq_state_name': item.get('locations', {}).get('region'),
               'hq_city_name': item.get('locations', {}).get('city'),
               'extras': {
                   'crunchbase': {k: v.isoformat() if isinstance(v, datetime.datetime) else v for k, v in item.items()}
               },
               'updated_at': timezone.now()
            }

            # Yield the company data as a dictionary.
            yield company_data
