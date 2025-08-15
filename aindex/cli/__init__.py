"""AINdex CLI."""

import click

from aindex.conf import settings  # noqa

from .openai import openai_cli
from .pdf import pdf_cli
from .utils import utils_cli


@click.group()
def main():
    pass


main.add_command(pdf_cli)
main.add_command(utils_cli)
main.add_command(openai_cli)

if __name__ == "__main__":
    main()
