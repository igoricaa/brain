import datetime
import json
from pathlib import Path

import pytest

from aindex.crunchbase.base import parse_crunchbase_organization, parse_date


def load_json_fixture(filename='basic-organization'):
    file_path = Path(f'tests/crunchbase/fixtures/{filename}.json')
    with open(file_path, 'r') as json_file:
        data = json.load(json_file)
    return data


@pytest.mark.parametrize(
    'raw_date',
    [
        (None, None),
        (1, None),
        ('2007-07-31T', datetime.datetime(2007, 7, 31)),
        ('2007-07-31T19:52:', None),
        ('2007-07-31', datetime.datetime(2007, 7, 31)),
        ('2007-07-31T19:52:13', datetime.datetime.fromisoformat('2007-07-31T19:52:13')),
        (
            '2007-07-31T19:52:13+00:00',
            datetime.datetime.fromisoformat('2007-07-31T19:52:13+00:00'),
        ),
    ],
)
def test_cb_parse_date(raw_date):
    raw_date_str, expected_date = raw_date

    parsed_date = parse_date(date_str=raw_date_str)
    assert parsed_date == expected_date
    assert isinstance(parsed_date, type(expected_date))


@pytest.mark.parametrize(
    'raw_org',
    [
        None,
        {},
        load_json_fixture(filename='basic-organization'),
    ],
)
def test_cb_parse_crunchbase_organization(raw_org):
    parsed_org = parse_crunchbase_organization(raw_org=raw_org)
    assert parsed_org is not None
    assert isinstance(parsed_org, dict)
    assert 'uuid' in parsed_org
    assert 'name' in parsed_org
    assert 'short_description' in parsed_org
    assert 'image_url' in parsed_org
    assert 'facebook_url' in parsed_org
    assert 'linkedin_url' in parsed_org
    assert 'twitter_url' in parsed_org
    assert 'website_url' in parsed_org
    assert 'crunchbase_url' in parsed_org
    assert 'locations' in parsed_org
    assert 'diversity_spotlights' in parsed_org
    assert 'created_at' in parsed_org
    assert 'updated_at' in parsed_org
