from common.storage import get_storage_class


def deck_file_path(instance, filename):
    """Stores the resource in a "decks/{UUID}/file" folder"""
    return f'decks/{instance.uuid}/file/{filename}'


def deck_page_screenshot_path(instance, filename):
    """Stores the resource in a "decks/{deck-UUID}/pages-screenshot" folder"""
    return f'decks/{instance.deck.uuid}/pages-screenshots/{filename}'


decks_file_storage = get_storage_class('decks')
