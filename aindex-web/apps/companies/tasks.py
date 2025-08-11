import time

from django.apps import apps

from celery import shared_task


@shared_task(rate_limit='2/s')
def pull_company_crunchbase_attrs(pk):
    """Pull and save additional attributes from crunchbase API."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    result_attributes = company.pull_crunchbase_attrs()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'crunchbase_data': result_attributes
    }


@shared_task()
def pull_company_openai_attrs(pk):
    """Extract and save additional company attributes from openai."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    result_attributes = company.pull_openai_attrs()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_attributes': result_attributes
    }


@shared_task()
def pull_company_grants(pk, update_company=True):
    """Pull and save company grants."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    result = company.pull_grants(update_company=update_company)

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'grants': result
    }


@shared_task()
def pull_company_patent_applications(pk):
    """Pull and save company patent applications."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    result_attributes = company.pull_patent_applications()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'patent_applications': result_attributes
    }


@shared_task()
def pull_company_clinical_studies(pk):
    """Pull and save company clinical studies."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    result = company.pull_clinical_studies()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'clinical_studies': result
    }


@shared_task(time_limit=30)
def save_company_image_from_url(pk, url):
    """Download and save company image from URL."""

    start_time = time.perf_counter()

    company_model = apps.get_registered_model('companies', 'Company')
    company = company_model.objects.get(pk=pk)
    saved = company.save_image_from_url(url)

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk,
            'url': url
        },
        'saved': saved
    }
