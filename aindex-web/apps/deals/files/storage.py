import importlib

from django.conf import settings


def deck_file_path(instance, filename):
    """Stores the resource in a "decks/{UUID}/file" folder"""
    return f'decks/{instance.uuid}/file/{filename}'


def deck_page_screenshot_path(instance, filename):
    """Stores the resource in a "decks/{deck-UUID}/pages-screenshot" folder"""
    return f'decks/{instance.deck.uuid}/pages-screenshots/{filename}'


def get_storage_class(storage_name):
    storage_settings = settings.STORAGES[storage_name]
    modules = storage_settings['BACKEND'].split('.')
    storage_module = importlib.import_module('.'.join(modules[:-1]))
    storage_class = getattr(storage_module, modules[-1])

    kwargs = storage_settings.get('OPTIONS', {})
    return storage_class(**kwargs)


decks_file_storage = get_storage_class('decks')
