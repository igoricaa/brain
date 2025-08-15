"""Overriding documentai_toolbox.wrappers.document.Document.from_batch_process_operation
to try to avoid unnecessarily hitting quota limits.
https://github.com/googleapis/python-documentai-toolbox/issues/246
"""


import dataclasses
import time
from typing import List, Optional, Type

from google.api_core.client_options import ClientOptions
from google.cloud import documentai
from google.cloud.documentai_toolbox import document
from google.longrunning.operations_pb2 import GetOperationRequest, Operation


def _get_batch_process_metadata(
    location: str, operation_name: str, polling_interval: Optional[float] = None
) -> documentai.BatchProcessMetadata:
    r"""Get `BatchProcessMetadata` from a `batch_process_documents()` long-running operation.

    Args:
        location (str):
            Required. The location of the processor used for `batch_process_documents()`.

        operation_name (str):
            Required. The fully qualified operation name for a `batch_process_documents()` operation.

        polling_interval (float):
            Time interval in seconds between operation requests to avoid exceeding documentai
            quota rate limit.

    Returns:
        documentai.BatchProcessMetadata:
            Metadata from batch process.
    """
    client = documentai.DocumentProcessorServiceClient(
        client_options=ClientOptions(
            api_endpoint=f"{location}-documentai.googleapis.com"
        )
    )

    while True:
        operation: Operation = client.get_operation(
            request=GetOperationRequest(name=operation_name)
        )

        if operation.done:
            break

        # wait a bit then continue
        if polling_interval:
            time.sleep(polling_interval)

    if not operation.metadata:
        raise ValueError(f"Operation does not contain metadata: {operation}")

    metadata_type = (
        "type.googleapis.com/google.cloud.documentai.v1.BatchProcessMetadata"
    )

    if not operation.metadata.type_url or operation.metadata.type_url != metadata_type:
        raise ValueError(
            f"Operation metadata type is not `{metadata_type}`. Type is `{operation.metadata.type_url}`."
        )

    metadata: documentai.BatchProcessMetadata = (
        documentai.BatchProcessMetadata.deserialize(operation.metadata.value)
    )

    return metadata


@dataclasses.dataclass
class Document(document.Document):

    @classmethod
    def from_batch_process_operation(
        cls: Type["Document"], location: str, operation_name: str, polling_interval: Optional[float] = None
    ) -> List["Document"]:
        r"""Loads Documents from Cloud Storage, using the operation name returned from
        `batch_process_documents()`.

            .. code-block:: python

                from google.cloud import documentai
                from google.cloud.documentai_toolbox import document

                operation = client.batch_process_documents(request)
                operation_name = operation.operation.name
                wrapped_document = document.Document.from_batch_process_operation(operation_name)

        Args:
            location (str):
                Required. The location of the processor used for `batch_process_documents()`.

            operation_name (str):
                Required. The fully qualified operation name for a `batch_process_documents()` operation.

                Format: `projects/{project}/locations/{location}/operations/{operation}`

            polling_interval (float):
                Time interval in seconds between operation requests to avoid exceeding documentai
                quota rate limit.

        Returns:
            List[Document]:
                A list of wrapped documents from gcs. Each document corresponds to an input file.
        """
        return cls.from_batch_process_metadata(
            metadata=_get_batch_process_metadata(
                location=location, operation_name=operation_name, polling_interval=polling_interval
            )
        )
