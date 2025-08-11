import time

from django.apps import apps

from celery import shared_task


@shared_task()
def pull_founder_coresignal_data(pk):
    """Pull Founder data from Coresignal API."""

    start_time = time.perf_counter()

    founder_model = apps.get_registered_model('talents', 'Founder')
    founder = founder_model.objects.get(pk=pk)
    coresignal_data = founder.pull_coresignal_data()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'coresignal_data': coresignal_data
    }


@shared_task()
def pull_founder_openai_attrs(pk):
    """Extract and save additional founder attributes."""

    start_time = time.perf_counter()

    founder_model = apps.get_registered_model('talents', 'Founder')
    founder = founder_model.objects.get(pk=pk)
    result_attributes = founder.pull_openai_attrs()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_attributes': result_attributes
    }


@shared_task()
def pull_founder_data(pk):
    start_time = time.perf_counter()

    todo = (pull_founder_coresignal_data.si(pk=pk) | pull_founder_openai_attrs.si(pk=pk))
    todo.delay()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
    }
