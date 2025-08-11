import io
import uuid
from pathlib import Path

from google.api_core.client_options import ClientOptions
from google.cloud import documentai, storage
from google.longrunning.operations_pb2 import ListOperationsRequest
from PIL import Image

from ..conf import settings
from ..gcp import get_gcp_credentials
from ..utils import is_gcs_uri
from .documentai_toolbox_patch import Document

__all__ = ['DocAIPDFParser']


class DocAIPDFParser:
    """Parser for PDF using Google Document AI."""

    def __init__(self, src):

        self.src = src

        self.credentials = get_gcp_credentials()
        client_options = ClientOptions(
            api_endpoint=f"{settings.google_ocr_location}-documentai.googleapis.com"
        )
        self.client = documentai.DocumentProcessorServiceClient(
            credentials=self.credentials,
            client_options=client_options
        )

        gcs_output_config = documentai.DocumentOutputConfig.GcsOutputConfig(
            gcs_uri=settings.google_ocr_output_gcs
        )
        self.output_config = documentai.DocumentOutputConfig(gcs_output_config=gcs_output_config)

        self.input_config = self.get_input_config()

        self.processed_documents = None

    def save_src_to_gcs(self):
        """Uploads the src file to the GCS."""

        src = Path(self.src)

        storage_client = storage.Client(credentials=self.credentials)
        blob_uri = f'{settings.google_ocr_input_gcs}_dry_port/{uuid.uuid4()}/{src.name}'
        blob = storage.Blob.from_string(blob_uri, client=storage_client)
        blob.upload_from_filename(src, if_generation_match=0)

        return blob_uri

    def get_input_config(self):
        if is_gcs_uri(self.src):
            gcs_uri = self.src
        elif isinstance(self.src, Path) or Path(self.src).exists():
            gcs_uri = self.save_src_to_gcs()
        else:
            gcs_uri = f'{settings.google_ocr_input_gcs}{self.src}'

        gcs_document = documentai.GcsDocument(
            gcs_uri=gcs_uri, mime_type='application/pdf'
        )
        # Load GCS Input URI into a List of document files
        gcs_documents = documentai.GcsDocuments(documents=[gcs_document])
        input_config = documentai.BatchDocumentsInputConfig(gcs_documents=gcs_documents)
        return input_config

    def process(self):

        resource_name = self.client.processor_path(
            settings.google_ocr_project_id,
            settings.google_ocr_location,
            settings.google_ocr_processor_id
        )

        request = documentai.BatchProcessRequest(
            name=resource_name,
            input_documents=self.input_config,
            document_output_config=self.output_config
        )

        # BatchProcess returns a Long Running Operation (LRO)
        operation = self.client.batch_process_documents(request)

        # Operation Name Format: projects/{project_id}/locations/{location}/operations/{operation_id}
        self.processed_documents = Document.from_batch_process_operation(
            location=settings.google_ocr_location,
            operation_name=operation.operation.name,
            polling_interval=settings.google_ocr_polling_interval
        )

    def read_pages(self):
        """Generate processed results per page"""
        if self.processed_documents is None:
            self.process()

        for document in self.processed_documents:
            for page in document.pages:

                yield {
                    'page_number': page.page_number,
                    'text': page.text
                }

    def read_text_blocks(self):
        """Generate text block found in the document"""
        if self.processed_documents is None:
            self.process()

        for document in self.processed_documents:
            for page in document.pages:
                for i, block in enumerate(page.blocks):
                    yield {
                        'page_number': page.page_number,
                        'index_number': i,
                        'text': block.text,
                    }

    def extract_text(self):
        if self.processed_documents is None:
            self.process()

        return ''.join([document.text for document in self.processed_documents])

    def screenshot_pages(self, output_dir):
        """Save screenshot images for each PDF page in the output directory.

        Args:
            output_dir (Path):
                path to the directory where images will be saved.
        """
        if self.processed_documents is None:
            self.process()

        for document in self.processed_documents:
            for page in document.pages:
                image = Image.open(io.BytesIO(page.documentai_object.image.content))
                output_path = output_dir / f'{page.page_number}.png'

                with output_path.open('wb') as output_file:
                    image.save(output_file)

    def list_operations(self, operations_filter='type=BATCH_PROCESS_DOCUMENTS'):

        # "TYPE=BATCH_PROCESS_DOCUMENTS AND STATE=RUNNING" for filtering

        # Format: `projects/{project_id}/locations/{location}`
        name = self.client.common_location_path(project=settings.google_ocr_project_id,
                                                location=settings.google_ocr_location)
        request = ListOperationsRequest(
            name=f"{name}/operations",
            filter=operations_filter,
        )

        operations = self.client.list_operations(request=request)
        return operations


def docai_parse_simple_pdf(src):
    """Parse a small local PDF file using synchronous online processing from DocumentAI.

    The source file must not exceed 15 pages and there are limitations on file size.
    """
    credentials = get_gcp_credentials()
    client = documentai.DocumentProcessorServiceClient(
        credentials=credentials,
        client_options=ClientOptions(api_endpoint=f"{settings.google_ocr_location}-documentai.googleapis.com")
    )

    resource_path = client.processor_path(
        settings.google_ocr_project_id,
        settings.google_ocr_location,
        settings.google_ocr_processor_id
    )

    with open(src, "rb") as image:
        image_content = image.read()

    # Load Binary Data into Document AI RawDocument Object
    raw_document = documentai.RawDocument(content=image_content, mime_type='application/pdf')

    # Configure the process request
    request = documentai.ProcessRequest(name=resource_path, raw_document=raw_document)

    # Use the Document AI client to process the sample form
    result = client.process_document(request=request)

    document = result.document

    for page in document.pages:
        page_text = ''

        for block in page.blocks:
            page_text += ''.join(
                document.text[int(segment.start_index): int(segment.end_index)]
                for segment in block.layout.text_anchor.text_segments
            )

        yield {
            'page_number': page.page_number,
            'text': page_text
        }
