import json
from pathlib import Path

import click

DOCUMENTAI = 'documentai'
PDFMINER = 'pdfminer'


@click.command(name='extract-text')
@click.argument('source')
@click.option('--parser', 'parser_name',
              type=click.Choice([DOCUMENTAI, PDFMINER]),
              default=DOCUMENTAI, show_default=True,
              help='Type of parser to be used for processing the PDF.')
@click.option('--output-path', '-o', type=Path,
              help='File path for saving the output')
def extract_pdf_text_cli(source, parser_name=DOCUMENTAI, output_path=None):
    """Extract text from a PDF file

    \b
    SOURCE:         Local file path or GCS URI to the input PDF file.

    """
    from aindex.parsers import get_pdf_parser_class

    parser_class = get_pdf_parser_class(parser_name)
    parser = parser_class(source)
    text = parser.extract_text()

    if output_path:
        output_path = output_path.expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open('w') as output_file:
            output_file.write(text)
    else:
        print(text)


@click.command(name='read-pages')
@click.argument('source')
@click.option('--parser', 'parser_name',
              type=click.Choice([DOCUMENTAI, PDFMINER]),
              default=DOCUMENTAI, show_default=True,
              help='Type of parser to be used for processing the PDF.')
@click.option('--output-path', '-o', type=Path,
              help='File path for saving the output')
def read_pdf_pages_cli(source, parser_name=DOCUMENTAI, output_path=None):
    """Parse pages of a PDF file and return results as JSON lines.

    If `output_path` is not specified output will be printed to stdout.

    \b
    SOURCE:         Local file path or GCS URI to the input PDF file.

    """
    from aindex.parsers import get_pdf_parser_class
    from aindex.utils.io import values2json

    parser_class = get_pdf_parser_class(parser_name)
    parser = parser_class(source)
    pages = parser.read_pages()

    if output_path:

        # save output to file
        output_path = output_path.expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        values2json(pages, output_path)

    else:
        # write to stdout
        for page in pages:
            print(json.dumps(page))


@click.command(name='screenshot-pages')
@click.argument('source')
@click.argument('output_dir', type=Path)
@click.option('--parser', 'parser_name',
              type=click.Choice([DOCUMENTAI, PDFMINER]),
              default=DOCUMENTAI, show_default=True,
              help='Type of parser to be used for processing the PDF.')
def screenshot_pdf_pages_cli(source, output_dir, parser_name=DOCUMENTAI):
    """Save screenshot images for each PDF page in the output directory.

    \b
    SOURCE:         Local file path or GCS URI to the input PDF file.
    OUTPUT_DIR:     path to the directory where images will be saved.

    """
    from aindex.parsers import get_pdf_parser_class

    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    parser_class = get_pdf_parser_class(parser_name)
    parser = parser_class(source)
    parser.screenshot_pages(output_dir)
