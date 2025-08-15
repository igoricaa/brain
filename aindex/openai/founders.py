import json

from .assistant_schemas import FounderAssistantSchema
from .base import OpenAIAssistant

__all__ = ['FounderAssistant', 'extract_founder_attrs']


class FounderAssistant(OpenAIAssistant):

    def __init__(self, **kwargs):
        """
        Args:
            founder (dict):
                A dictionary of baseline founder's information.
                Some expected keys include

                - name: name of the founder
                - company_name: name of the company

            education (list):
                A list of education background dictionaries including institution_name, program_name,
                description, date_from, and date_to

            experience (list):
                A list of professional experience dictionaries including company_name, title and description

            kwargs:
                Additional keyword arguments passed to ``BaseReader()``

        """

        # Assistant tools
        self.assistant_schema = FounderAssistantSchema()

        super().__init__(**kwargs)

    def get_founder_attrs_prompt(self):
        """returns a prompt for extracting company founder's attributes"""
        return self.render_template('du_founder_attributes_prompt.txt')

    def gen_founder_attributes(self, founder, education=None, experience=None, **kwargs):
        """Extract company attributes.

        Args:
            founder (dict):
                A dictionary of baseline founder's information.
                Some expected keys include

                - name: name of the founder
                - company_name: name of the company

            education (list):
                A list of education background dictionaries including institution_name, program_name,
                description, date_from, and date_to

            experience (list):
                A list of professional experience dictionaries including company_name, title and description

        Returns:
            dict
        """

        prompt_message = self.render_template(
            'founder_attributes_prompt.txt',
            founder=founder,
            education=education,
            experience=experience,
            **kwargs,
        )
        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.founder_attributes,
        )
        attributes = json.loads(response.tool_calls[0].function.arguments)

        return attributes


def extract_founder_attrs(founder, education=None, experience=None, **kwargs):
    """Extract attributes of the specified founder.

    Args:
        founder (dict):
            A dictionary of baseline founder information.
            Some expected keys include

            - name: name of the founder
            - company_name: name of the company

        education (list):
            A list of education background dictionaries including institution_name, program_name,
            description, date_from, and date_to

        experience (list):
            A list of professional experience dictionaries including company_name, title and description

    kwargs:
        Additional keyword arguments passed to `DUFounderReader`.

    Return:
        dict: Extracted founder information.
    """
    assistant = FounderAssistant()
    return assistant.gen_founder_attributes(founder, education=education, experience=experience, **kwargs)
