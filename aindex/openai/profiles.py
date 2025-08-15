import json

from .assistant_schemas import ProfileAssistantSchema
from .base import OpenAIAssistant

__all__ = ['ProfileAssistant', 'extract_profile_attrs']


class ProfileAssistant(OpenAIAssistant):

    def __init__(self, **kwargs):
        # Assistant tools

        self.assistant_schema = ProfileAssistantSchema()
        super().__init__(**kwargs)

    def gen_profile_attributes(self, profile, education=None, experience=None, **kwargs):
        """Extract profile attributes.

        Args:
            profile (dict):
                A dictionary of baseline profile's information.
                Some expected keys include

                - name: name of the person

            education (list):
                A list of education background dictionaries including institution_name, program_name,
                description, date_from, and date_to

            experience (list):
                A list of professional experience dictionaries including company_name, title and description

        Returns:
            dict
        """

        prompt_message = self.render_template(
            'profile_attributes_prompt.txt',
            profile=profile,
            education=education,
            experience=experience,
            **kwargs,
        )
        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.profile_attributes,
        )
        attributes = json.loads(response.tool_calls[0].function.arguments)

        return attributes


def extract_profile_attrs(profile, education=None, experience=None, **kwargs):
    """Extract attributes of the specified profile

    Args:
        profile (dict):
            A dictionary of baseline profile information.
            Some expected keys include

            - name: the name of the person

        education (list):
            A list of education background dictionaries including institution_name, program_name,
            description, date_from, and date_to

        experience (list):
            A list of professional experience dictionaries including company_name, title and description

    kwargs:
        Additional keyword arguments passed to the prompt template render.

    Return:
        dict: Extracted profile information.
    """
    assistant = ProfileAssistant()
    return assistant.gen_profile_attributes(profile, education=education, experience=experience, **kwargs)
