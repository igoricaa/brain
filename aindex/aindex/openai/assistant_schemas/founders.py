__all__ = ['FounderAssistantSchema']


class FounderAssistantSchema:
    """Founders assistant schema"""

    def __init__(self, attributes_function_name='founder_attributes'):
        self.attributes_function_name = attributes_function_name

    @property
    def founder_attributes(self):
        """Extraction of additional founder's attributes."""

        return [
            {
                'type': 'function',
                'function': {
                    'name': self.attributes_function_name,
                    'description': 'Format the answers in the proprietary format',
                    'parameters': {
                        'type': 'object',
                        'properties': {
                            'title': {
                                'type': 'string',
                                'description': 'The title of the founder in the company'
                            },
                            'past_significant_employments': {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                },
                                "description": 'A list of the names of the companies, government agencies, '
                                               'departments, or branches of the military that are described '
                                               'which the person has worked with.'
                            },
                            'prior_founding_count': {
                                'type': 'integer',
                                'description': "Number of prior attempts to start a other companies "
                                               "before the current company"
                            },
                        },
                    },
                },
            }
        ]
