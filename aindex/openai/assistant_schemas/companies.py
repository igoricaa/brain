__all__ = ['CompanyAssistantSchema']


class CompanyAssistantSchema:
    """Company assistant schema"""

    def __init__(self, industries=None, technology_types=None,
                 attributes_function_name='company_attributes'):

        self.attributes_function_name = attributes_function_name

        self.industries = industries
        self.technology_types = technology_types

    @property
    def company_attributes(self):
        """Extraction of additional basic company attributes."""

        return [
            {
                'type': 'function',
                'function': {
                    'name': self.attributes_function_name,
                    'description': 'Format the answers in the proprietary format',
                    'parameters': {
                        'type': 'object',
                        'properties': {
                            'industries': {
                                'type': 'array',
                                'items': {
                                    'type': 'string',
                                    'enum': [industry['name'] for industry in self.industries],
                                },
                                'description': 'Industry that mostly apply to the company among the '
                                               'specified choices.You can include up to three.'
                            },
                            'technology_type': {
                                'type': 'string',
                                'enum': [tech_type['name'] for tech_type in self.technology_types],
                                'description': 'Technology type description that applies to the company'
                            },
                        },
                        'required': ['industries', 'technology_type'],
                    },
                },
            }
        ]
