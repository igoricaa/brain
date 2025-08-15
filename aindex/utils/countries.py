import pycountry

__all__ = ['get_country']


def get_country(name):
    """Get country object by name"""

    if not name:
        return None

    country = pycountry.countries.get(name=name)

    if not country:
        matched = pycountry.countries.search_fuzzy(name)
        if matched:
            country = matched[0]

    return country
