import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

CONFIG_DIR = Path(os.environ.get('AINDEX_CONFIG_DIR', BASE_DIR))

ENV_FILE = os.environ.get('AINDEX_ENV_FILE', CONFIG_DIR / '.env')

ENV_PREFIX = os.environ.get('AINDEX_ENV_PREFIX', '')


class Settings(BaseSettings):

    default_pdf_parser: str = 'documentai'

    google_application_credentials: Path = CONFIG_DIR / '.credentials/gcp-key.json'
    google_ocr_project_id: str = ''
    google_ocr_location: str = 'us'
    google_ocr_processor_id: str = ''
    google_ocr_prediction_endpoint: str = ''
    google_ocr_input_gcs: str = ''
    google_ocr_output_gcs: str = ''
    google_ocr_polling_interval: float = 0.5

    vertexai_location: str = 'us-central1'
    vertexai_text_embedding_model: str = 'text-embedding-005'
    vertexai_assistants_model: str = 'gemini-2.5-pro'

    openai_api_key: str = ''

    # Using VertexAI through VertexAI client
    # https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview
    openai_assistants_use_vertexai: bool = True
    openai_assistants_model: str = 'gemini-2.5-pro'

    affinity_api_key: str = ''
    coresignal_api_key: str = ''
    crunchbase_api_key: str = ''
    uspto_api_key: str = ''

    tmp_dir: Path = Path('/tmp/aindex/')

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_prefix=ENV_PREFIX,
        extra='ignore'
    )


settings = Settings()

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(settings.google_application_credentials)
