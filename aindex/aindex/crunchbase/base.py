from dateutil import parser as date_parser

__all__ = ['CrunchbaseError', 'CrunchbaseAPIError']

# Fields accessible from the Crunchbase API V4 for organizations under the basic plan.
# These fields include both metadata and specific organizational data.
ORG_BASIC_FIELDS = [
    'created_at',  # Timestamp when the organization was added
    'diversity_spotlights',  # Types of diversity represented in the organization
    'facebook',  # Link to Organization's Facebook page
    'image_url',  # The cloudinary url of the profile image
    'linkedin',  # Link to Organization's LinkedIn page
    'location_identifiers',  # Where the organization is headquartered (e.g. San Francisco Bay Area, Silicon Valley)  # noqa E501
    'name',  # Official name of the organization
    'permalink',  # URL-friendly identifier (slug) used in Crunchbase URLs
    'short_description',  # Text of Organization Description, Industries, and Industry Groups
    'twitter',  # Link to Organization's Twitter page
    'updated_at',  # Timestamp when the organization's data was last updated
    'uuid',  # Universal Unique Identifier for the organization
    'website_url',  # Link to Organization's homepage
]

# Crunchbase organizations base URL
ORG_BASE_URL = 'https://www.crunchbase.com/organization'

ORG_SEARCH_ENDPOINT_NAME = 'data/searches/organizations'
ORG_SEARCH_MAX_LIMIT = 2000
ORG_SEARCH_DEFAULT_LIMIT = 100
ORG_SEARCH_BASIC_ORDER = [{'sort': 'asc', 'field_id': 'rank_org_company'}]
ORG_SEARCH_BASIC_QUERY = [
    {
        'operator_id': 'includes',
        'type': 'predicate',
        'field_id': 'location_identifiers',
        'values': [  # Canada, Europe, United States
            '1b3d6217-ec76-1b13-c47a-aca49b466a2c',
            '6106f5dc-823e-5da8-40d7-51612c0b2c4e',
            'f110fca2-1055-99f6-996d-011c198b3928',
        ],
    }
]

DIVERSITY_TAGS = {
    'asian': {'south asian founded', 'south asian led ', 'east asian founded', 'east asian led',
              'southeast asian founded', 'southeast asian led'},
    'black': {'black founded', 'black led'},
    'hispanic': {'hispanic / latine founded', 'hispanic / latine led'},
    'meo': {'middle eastern / north african founded', 'middle eastern / north african led',
            'indigenous founded', 'indigenous led',
            'native hawaiian / pacific islander founded', 'native hawaiian / pacific islander led'},
    'women': {'women founded', 'women led'},
}


def parse_date(date_str=None):
    """
    Parse a date string in ISO 8601 format to a datetime object.

    Args:
        date_str (Optional[str]):
            A string representing a date in ISO 8601 format.

    Returns:
        Optional[datetime.datetime]:
            A `datetime.datetime` object if the input string is successfully
            parsed. Returns `None` if the input string is `None`, not
            provided, or invalid.
    """
    try:
        dt = date_parser.parse(date_str)
        return dt
    except (ValueError, TypeError, date_parser.ParserError):
        return None


def parse_crunchbase_organization(raw_org):
    """
    Parse, transform, and normalize a raw Crunchbase organization.

    Args:
        raw_org (Dict[str, Optional[Any]]):
            A dictionary containing raw data of an organization from
            Crunchbase.

    Returns:
        Dict[str, Optional[Any]]:
            A dictionary containing the parsed and normalized organization
            data. Keys include 'uuid', 'name', 'short_description',
            'image_url', 'facebook_url', 'linkedin_url', 'twitter_url',
            'website_url', 'crunchbase_url', 'locations',
            'diversity_spotlights', 'created_at', and 'updated_at'.
    """

    # Initialize the parsed organization
    org = {}

    # Extract raw organization properties
    raw_org_props = raw_org.get('properties') or {} if raw_org else {}

    # Parse and assign basic properties
    org['uuid'] = raw_org_props.get('uuid')
    org['name'] = raw_org_props.get('name')
    org['short_description'] = raw_org_props.get('short_description')
    org['image_url'] = raw_org_props.get('image_url')

    # Parse social media URLs
    org['facebook_url'] = raw_org_props.get('facebook', {}).get('value')
    org['linkedin_url'] = raw_org_props.get('linkedin', {}).get('value')
    org['twitter_url'] = raw_org_props.get('twitter', {}).get('value')

    # Parse the organization's website URL
    org['website_url'] = raw_org_props.get('website_url')

    # Parse Crunchbase URL
    permalink = raw_org_props.get('permalink')
    org['crunchbase_url'] = f'{ORG_BASE_URL}/{permalink}' if permalink else None

    # Parse location properties
    org['locations'] = None
    locations = raw_org_props.get('location_identifiers')
    if locations and isinstance(locations, list):
        org['locations'] = {
            location.get('location_type'): location.get('value')
            for location in locations
            if location and isinstance(location, dict) and location.get('location_type')
        }

    # Parse diversity spotlight properties
    org['diversity_spotlights'] = None
    diversity_spotlights = raw_org_props.get('diversity_spotlights')
    if diversity_spotlights and isinstance(diversity_spotlights, list):
        org['diversity_spotlights'] = [
            spotlight.get('value')
            for spotlight in diversity_spotlights
            if spotlight and isinstance(spotlight, dict) and spotlight.get('value')
        ]

    diversity_tags = set([tag.lower() for tag in (org['diversity_spotlights'] or [])])
    org['has_women_on_founders'] = not diversity_tags.isdisjoint(DIVERSITY_TAGS['women'])
    org['has_black_on_founders'] = not diversity_tags.isdisjoint(DIVERSITY_TAGS['black'])
    org['has_asian_on_founders'] = not diversity_tags.isdisjoint(DIVERSITY_TAGS['asian'])
    org['has_hispanic_on_founders'] = not diversity_tags.isdisjoint(DIVERSITY_TAGS['hispanic'])
    org['has_meo_on_founders'] = not diversity_tags.isdisjoint(DIVERSITY_TAGS['meo'])
    org['has_diversity_on_founders'] = not diversity_tags.isdisjoint(set().union(*DIVERSITY_TAGS.values()))

    # Parse timestamp properties
    org['created_at'] = parse_date(date_str=raw_org_props.get('created_at'))
    org['updated_at'] = parse_date(date_str=raw_org_props.get('updated_at'))

    # Return parsed and normalized organization
    return org


class CrunchbaseError(Exception):
    pass


class CrunchbaseAPIError(CrunchbaseError):
    pass
