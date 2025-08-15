import json

from .assistant_schemas import CompanyAssistantSchema
from .base import OpenAIAssistant

__all__ = ['CompanyAssistant', 'extract_company_attrs']


class CompanyAssistant(OpenAIAssistant):

    DEFAULT_INDUSTRIES = ['Advanced Materials', 'Aerospace (Air)', 'Aerospace (Space)', 'Analytics',
                          'Artificial Intelligence', 'Augmented/Virtual Reality', 'Automotive',
                          'Biotechnology', 'Blockchain', 'Budgeting', 'Business Processses', 'CleanTech',
                          'Collaboration', 'Community Engagement', 'Compliance', 'Computation',
                          'Computer Vision', 'Cybersecurity', 'Data Center', 'Data Management',
                          'Data Science', 'Data Storage', 'Defense', 'Developer Tools', 'Drones',
                          'Elections', 'Energy Tech', 'Enterprise Software', 'Fintech', 'Geospatial',
                          'Healthcare Administration', 'Human Resources', 'Identity Management',
                          'Infrastructure', 'IoT', 'Law Enforcement', 'Legal', 'Manufacturing',
                          'Medical Technology', 'Microprocessors', 'name', 'Networking',
                          'Performance Management', 'Pharmaceuticals', 'Physical Security',
                          'Procurement/Contracts', 'Public Safety', 'Quantum Computation',
                          'Research & Development', 'Risk Management', 'Robotics',
                          'Satellite Communications', 'Search', 'Secure Communications', 'Sensing',
                          'Smart Cities', 'Sustainability Tech', 'Urban Planning', 'Web Operations',
                          'Wireless Networking']

    DEFAULT_TECHNOLOGY_TYPES = ['Hardware', 'Software', 'Hybrid']

    def __init__(self, industries=None, technology_types=None, **kwargs):
        """
        Args:
            industries (list):
                A list of industries that should be used as choices in classifying the company

            technology_types (list):
                A list of types that should be used as choices in classifying the company

            kwargs:
                Additional keyword arguments passed to ``BaseReader()``
        """

        super().__init__(**kwargs)

        # baseline info
        self.industries = industries or [{'name': industry} for industry in self.DEFAULT_INDUSTRIES]
        self.industries_names = [industry.get('name') for industry in self.industries]
        self.technology_types = technology_types or [{'name': tech} for tech in self.DEFAULT_TECHNOLOGY_TYPES]

        # Assistant tools
        self.assistant_schema = CompanyAssistantSchema(
            industries=self.industries,
            technology_types=self.technology_types
        )

    def get_prompt_context(self, **context):
        return {
            'industries': self.industries,
            'technology_types': self.technology_types,
            **context
        }

    def gen_company_attributes(self, company, **kwargs):
        """Extract company attributes.

        Args:
            company (dict):
                A dictionary of baseline company information.
                Some expected keys include

                - name: name of the company
                - summary: short description of the company
                - description; full/long description of the company
                - cb_industries_names: a list of industry names as classified by Crunchbase.

        Returns:
            dict
        """

        prompt_message = self.render_template('company_attributes_prompt.txt', company=company, **kwargs)
        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.company_attributes,
        )
        attributes = json.loads(response.tool_calls[0].function.arguments)

        attributes['industries'] = [
            industry for industry in attributes.get('industries', [])
            if industry in self.industries_names
        ]

        return attributes


def extract_company_attrs(company, industries=None, technology_types=None, **kwargs):
    """Extract attributes from a company.

    Args:
        company (dict):
            A dictionary of baseline company information.
            Some expected keys include

            - name: name of the company
            - summary: short description of the company
            - description; full/long description of the company
            - cb_industries_names: a list of industry names as classified by Crunchbase.

        industries (list):
            A list of industries that should be used as choices in classifying the company

        technology_types (list):
            A list of types that should be used as choices in classifying the company
        kwargs:
            Additional keyword arguments passed to `CompanyAssistant.gen_company_attributes`.

    Return:
        dict: Extracted company information.
    """
    assistant = CompanyAssistant(industries=industries, technology_types=technology_types)
    return assistant.gen_company_attributes(company, **kwargs)
