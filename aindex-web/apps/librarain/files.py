from common.files.storage import get_storage_class

documents_file_storage = get_storage_class('documents')


def source_image_path(instance, filename):
    """Stores the resource in a "librarain/sources/{source-UUID}/image" folder"""
    return f'librarain/sources/{instance.uuid}/image/{filename}'


def document_file_path(instance, filename):
    """Stores the resource in a "librarain/documents/{source-UUID}/file" folder"""
    return f'librarain/documents/{instance.uuid}/file/{filename}'
