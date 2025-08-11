import importlib

from django.conf import settings


def get_storage_class(storage_name):
    storage_settings = settings.STORAGES[storage_name]
    modules = storage_settings['BACKEND'].split('.')
    storage_module = importlib.import_module('.'.join(modules[:-1]))
    storage_class = getattr(storage_module, modules[-1])

    kwargs = storage_settings.get('OPTIONS', {})
    return storage_class(**kwargs)
