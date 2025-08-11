from .base import pdf_cli
from .parsers import extract_pdf_text_cli, read_pdf_pages_cli, screenshot_pdf_pages_cli

pdf_cli.add_command(extract_pdf_text_cli)
pdf_cli.add_command(read_pdf_pages_cli)
pdf_cli.add_command(screenshot_pdf_pages_cli)
