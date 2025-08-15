import csv

from .files import iter_files

__all__ = [
    'csv2values',
    'values2csv'
]


def csv2values(input_path, **kwargs):
    """
    Generate dict values from the CSV file.
    """

    # read csv file
    for path in iter_files(input_path):
        with path.open('r') as input_file:
            reader = csv.DictReader(input_file, **kwargs)
            yield from reader


def values2csv(values, output_path, **kwargs):
    """
    Write an Iterable of dict values to a CSV file.

    Args:
        values (Iterable):
            An iterable of dicts
        output_path (Path):
            Path to the output file.
    """

    values = iter(values)
    with output_path.open('w') as output_file:
        first_record = next(values)
        field_names = first_record.keys()
        writer = csv.DictWriter(output_file, field_names, **kwargs)
        writer.writeheader()
        writer.writerow(first_record)
        writer.writerows(values)
