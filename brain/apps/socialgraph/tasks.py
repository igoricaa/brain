import time

from django.apps import apps

from celery import shared_task


@shared_task()
def pull_profile_coresignal_data(pk):
    """Pull profile data from Coresignal API."""

    start_time = time.perf_counter()

    profile_model = apps.get_registered_model('socialgraph', 'Profile')
    profile = profile_model.objects.get(pk=pk)
    coresignal_data = profile.pull_coresignal_data()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'coresignal_data': coresignal_data,
    }


@shared_task()
def pull_profile_openai_attrs(pk):
    """Extract and save additional profile attributes."""

    start_time = time.perf_counter()

    profile_model = apps.get_registered_model('socialgraph', 'Profile')
    profile = profile_model.objects.get(pk=pk)
    result_attributes = profile.pull_openai_attrs()

    end_time = time.perf_counter()

    return {'execution_time': end_time - start_time, 'parameters': {'pk': pk}, 'result_attributes': result_attributes}


@shared_task()
def pull_profile_data(pk):
    start_time = time.perf_counter()

    _task = pull_profile_coresignal_data.si(pk=pk) | pull_profile_openai_attrs.si(pk=pk)
    _task.delay()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
    }
