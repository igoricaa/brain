from pathlib import Path

import jinja2
import vertexai
from google import genai
from google.auth import default as google_auth_default
from google.genai.types import GenerateContentConfig, HttpOptions
from vertexai.language_models import TextEmbeddingModel

from ..conf import settings

__all__ = ['VertexAIAssistant', 'vertexai', 'get_text_embedding']

from ..utils.text import ordinal

vertexai.init()


def get_text_embedding(text):
    model = TextEmbeddingModel.from_pretrained(settings.vertexai_text_embedding_model)

    embeddings = model.get_embeddings([text])
    return embeddings


class BaseAssistant:

    default_system_instructions = (
        "You are an AI assistant to a venture capitalist named AIN who is "
        "assessing a companies for investment."
    )

    def __init__(self, system_instructions=None):

        self.system_instruction = system_instructions or self.default_system_instructions

        # Text templates
        self.templates_dir = Path(__file__).parent / 'templates'
        self.jinja2env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(self.templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self.jinja2env.filters['ordinal'] = ordinal

    def get_prompt_context(self, **context):
        """Override this to add base or default context"""
        return context

    def render_template(self, name, **context):
        context = self.get_prompt_context(**context)
        template = self.jinja2env.get_template(name)
        return template.render(context)


class VertexAIAssistant(BaseAssistant):

    def __init__(self, system_instructions=None):

        # Get project id
        google_credentials, project_id = google_auth_default()

        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=settings.vertexai_location,
            http_options=HttpOptions(api_version="v1"),
        )
        self.model_name = settings.vertexai_assistants_model

        super().__init__(system_instructions=system_instructions)

    def prompt(self, content, response_schema=None, response_mime_type='application/json', **kwargs):
        """Submit prompt for the response.

        Args:
            content (str):
                Prompt message.

            response_schema (dict or None):
                JSON schema of the response.

            response_mime_type (str):
                MIME type of the response.

            kwargs:
                extra arguments passed to content generation configuration.
                For more info check
                https://googleapis.github.io/python-genai/genai.html#genai.types.GenerateContentConfig

        Returns:
            genai.types.GenerateContentResponse
        """

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=content,
            config=GenerateContentConfig(
                response_mime_type=response_mime_type,
                response_schema=response_schema,
                system_instruction=self.system_instruction,
                **kwargs
            ),
        )

        return response
