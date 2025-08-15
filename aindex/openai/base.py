from pathlib import Path

import jinja2
from google.auth import default as google_auth_default
from google.auth.transport import requests as google_auth_requests
from openai import OpenAI

from ..conf import settings

__all__ = ['OpenAIChatStream', 'OpenAIAssistant']


class OpenAIChatStream:
    """A base class for working with OpenAI chat streams.

    This is also compatible with VertexAI,
    https://cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview .

    """

    def __init__(self, api_key=None, system_message=None):

        if settings.openai_assistants_use_vertexai:
            # More info available at https://cloud.google.com/vertex-ai/generative-ai/docs/start/openai

            # Get google credentials
            google_credentials, project_id = google_auth_default(
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            google_credentials.refresh(google_auth_requests.Request())

            location = settings.vertexai_location

            base_url = f'https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/endpoints/openapi'  # noqa: E501
            self.model_name = f'google/{settings.openai_assistants_model}'

            if not api_key:
                api_key = google_credentials.token
        else:
            base_url = None
            self.model_name = settings.openai_assistants_model

            if not api_key:
                api_key = settings.uspto_api_key

        self.client = OpenAI(api_key=api_key, base_url=base_url)

        self.messages = []
        if system_message:
            self.messages.append({'role': 'system', 'content': system_message})

    def submit(self, prompt, tools=None):
        """Submit chat for the response."""

        self.messages.append({"role": "user", "content": prompt})

        kwargs = {'model': self.model_name, 'messages': self.messages}

        if tools:
            kwargs['tools'] = tools

            kwargs['tool_choice'] = {
                'type': 'function',
                'function': {'name': tools[0]["function"]["name"]},
            }

        response = self.client.chat.completions.create(**kwargs)
        response_message = response.choices[0].message

        if response_message.content:
            self.messages.append({'role': 'assistant', 'content': response_message.content})

        if response_message.tool_calls:
            self.messages.append(
                {
                    'role': 'assistant',
                    'content': None,
                    'tool_calls': response_message.tool_calls,
                }
            )
            self.messages.append(
                {
                    'role': 'tool',
                    'tool_call_id': response_message.tool_calls[0].id,
                    'content': '  ',
                }
            )

        return response_message


class OpenAIAssistant:

    system_message = ("You are an AI assistant to a venture capitalist named AIN "
                      "who is assessing a companies for investment.")

    def __init__(self, openai_retries=3, token_margin=1000):
        """
        Args:
            token_margin (int):
                token margin for OpenAI prompts

            openai_retries (int):
                number of retries when prompting on OpenAI API.
        """
        self.openai_retries = openai_retries
        self.token_margin = token_margin

        # Text templates
        self.templates_dir = Path(__file__).parent / 'templates'
        self.jinja2env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(self.templates_dir))
        )

        # Chat stream
        self.chat_stream = OpenAIChatStream(system_message=self.system_message)

    def get_prompt_context(self, **context):
        """Override this to add base or default context"""
        return context

    def render_template(self, name, **context):
        context = self.get_prompt_context(**context)
        template = self.jinja2env.get_template(name)
        return template.render(context)
