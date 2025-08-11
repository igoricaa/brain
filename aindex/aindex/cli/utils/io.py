import csv
import json
from pathlib import Path

import click


@click.command(name='json2csv')
@click.argument('input_path', type=Path)
@click.argument('output_path', type=Path)
@click.option('--dialect', help='CSV dialect.')
@click.option('--delimiter', default=',', show_default=True,
              help='A one-character string used to separate fields in CSV')
def json_to_csv_cli(input_path, output_path, **kwargs):
    """Convert input JSON file to a CSV file

    \b
    INPUT_PATH:       Path to the input file.
    OUTPUT_PATH:      Path to the output file.
    """

    with output_path.open() as output_file:
        with input_path.open() as input_file:

            first_record = json.loads(input_file.readline())
            fields = first_record.keys()

            writer = csv.DictWriter(output_file, fields, **kwargs)
            writer.writeheader()
            writer.writerow(first_record)

            for line in input_file:
                record = json.loads(line)
                writer.writerow(record)
