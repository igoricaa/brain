import uuid
from pathlib import Path

from google.cloud import storage
from pdf2image import convert_from_path as pdf_to_images
from pdfminer.high_level import extract_pages, extract_text
from pdfminer.layout import LTTextContainer
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import resolve1
from pdfminer.pdfparser import PDFParser

from ..utils import get_tmp_dir, is_gcs_uri

__all__ = ['PDFMinerParser']


class PDFMinerParser:
    """Parser for PDF Decks using pdfminer.six."""

    def __init__(self, src):

        self.src = src

        if is_gcs_uri(src):
            self.gcs_src = src
            self._download_src_from_gcs()
        else:
            self.gcs_src = None

        if isinstance(self.src, str):
            self.src = Path(src)

    @property
    def page_count(self):
        with self.src.open('rb') as f:
            parser = PDFParser(f)
            document = PDFDocument(parser)
            return resolve1(document.catalog['Pages'])['Count']

    def read_pages(self):

        for page_layout in extract_pages(self.src):
            page_text = ''

            for element in page_layout:
                if isinstance(element, LTTextContainer):
                    page_text += element.get_text()

            yield {
                'page_number': page_layout.pageid,
                'text': page_text,
            }

    def read_text_blocks(self):
        """Generate text block found in the document"""

        for page_layout in extract_pages(self.src):

            for i, element in enumerate(page_layout):
                if isinstance(element, LTTextContainer):

                    yield {
                        'page_number': page_layout.pageid,
                        'index_number': i,
                        'text': element.get_text(),
                    }

    def extract_text(self):
        return extract_text(self.src)

    def screenshot_pages(self, output_dir):
        """Save screenshot images for each PDF page in the output directory.

        Args:
            output_dir (Path):
                path to the directory where images will be saved.
        """

        for page_number, page in enumerate(pdf_to_images(self.src), start=1):

            output_path = output_dir / f'{page_number}.png'

            with output_path.open('wb') as output_file:
                page.save(output_file)

    def _download_src_from_gcs(self):
        """Download the src file from GCS and store it a temporary path."""

        destination = get_tmp_dir() / f'_dry_port/{uuid.uuid4()}/{Path(self.gcs_src).name}'
        destination.parent.mkdir(exist_ok=True, parents=True)

        storage_client = storage.Client()
        blob = storage.Blob.from_string(self.gcs_src, client=storage_client)
        blob.download_to_filename(str(destination))
        self.src = destination

        return destination
