import json

from .files import iter_files

__all__ = [
    "json2values",
    "values2json",
]


def json2values(input_path, **kwargs):
    """Generate dict values from the JSON Lines file."""
    for path in iter_files(input_path):
        with path.open("r") as input_file:
            for line in input_file:
                yield json.loads(line, **kwargs)


def values2json(values, output_path, **kwargs):
    """
    Write an Iterable of dict values to JSON Lines file.

    Args:
        values (Iterable):
            An iterable of dicts
        output_path (Path):
            Path to the output file.
    """

    kwargs = {"ensure_ascii": False, **kwargs}

    with output_path.open("w") as output_file:
        for record in values:
            output_file.write(json.dumps(record, **kwargs) + "\n")
