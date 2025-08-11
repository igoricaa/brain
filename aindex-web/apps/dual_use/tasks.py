import time

from django.apps import apps

from celery import shared_task


@shared_task()
def pull_company_crunchbase_data(**kwargs):
    """
    Pull company data from the Crunchbase API.

    It pulls updated company information from Crunchbase. It tracks the number of records
    before and after the operation, as well as the most recent `updated_at`
    timestamp, and calculates the number of newly pulled records and those
    that were updated.

    Args:
        **kwargs (Dict[str, Optional[Any]]):
            Parameters passed to the `Company.pull_crunchbase_data` method.

    Returns:
        Dict[str, Optional[Any]]:
            A dictionary containing:
            - 'execution_time': Time taken to complete the operation (in seconds).
            - 'parameters': The arguments passed to the task.
            - 'before_latest_updated_at': The most recent `updated_at` timestamp before pulling data.
            - 'before_count': The count of company records before pulling data.
            - 'after_latest_updated_at': The most recent `updated_at` timestamp after pulling data.
            - 'after_count': The count of company records after pulling data.
            - 'updated_count': The number of records that were updated during the operation.
            - 'created_count': The number of new records pulled from Crunchbase.
    """

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('dual_use', 'Report')

    # Get before companies 'count' and latest 'updated_at'
    before_count = company_model.objects.count()
    before_latest_updated_at = None
    before_latest_created_at = None
    try:
        before_latest_cb_company = company_model.objects.filter(
            cb_uuid__isnull=False,
        ).latest('updated_at')
    except company_model.DoesNotExist:
        before_latest_cb_company = None
    if before_latest_cb_company:
        before_latest_updated_at = before_latest_cb_company.updated_at
        before_latest_created_at = before_latest_cb_company.created_at

    # Pull updated companies data from Crunchbase API
    company_model.objects.pull_crunchbase_data(**kwargs)

    # Get after companies 'count' and latest 'updated_at'
    after_count = company_model.objects.count()
    after_latest_updated_at = None
    try:
        after_latest_cb_company = company_model.objects.filter(
            cb_uuid__isnull=False,
        ).latest('updated_at')
    except company_model.DoesNotExist:
        after_latest_cb_company = None
    if after_latest_cb_company:
        after_latest_updated_at = after_latest_cb_company.updated_at

    # Count updated and created companies
    updated_count = 0
    if before_latest_cb_company:
        updated_count = company_model.objects.filter(
            updated_at__gt=before_latest_updated_at,
            created_at__lte=before_latest_created_at,
        ).count()
    created_count = after_count - before_count

    # Compute time taken to complete the operation (in seconds)
    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {**kwargs},
        'before_latest_updated_at': before_latest_updated_at,
        'before_count': before_count,
        'after_latest_updated_at': after_latest_updated_at,
        'after_count': after_count,
        'updated_count': updated_count,
        'created_count': created_count,
    }
