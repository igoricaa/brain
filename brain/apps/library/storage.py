from common.storage import get_storage_class

library_file_storage = get_storage_class('library')


def default_file_path(instance, filename):
    """Stores the resource in a "library/files/{UUID}/file" folder"""
    return f'library/files/{instance.uuid}/file/{filename}'
