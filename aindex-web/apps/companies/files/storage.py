def company_image_path(instance, filename):
    """Stores the resource in a "companies/{company-UUID}/image" folder"""
    return f'companies/{instance.uuid}/image/{filename}'
