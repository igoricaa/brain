__all__ = ['ProfileAssistantSchema']


class ProfileAssistantSchema:
    """Profile assistant schema"""

    def __init__(self, attributes_function_name='profile_attributes'):
        self.attributes_function_name = attributes_function_name

    @property
    def profile_attributes(self):
        """Extraction of additional profile attributes."""

        return [
            {
                'type': 'function',
                'function': {
                    'name': self.attributes_function_name,
                    'description': 'Format the answers in the proprietary format',
                    'parameters': {
                        'type': 'object',
                        'properties': {
                            'bachelor_grad_year': {
                                'type': 'integer',
                                'description': "A year that the person finishing a bachelor's degree"
                            },
                            'bachelor_degree_type': {
                                'type': 'string',
                                'description': "A type of bachelor's degree which the person has"
                            },
                            'bachelor_school': {
                                'type': 'string',
                                'description': "Name of a school which the person finished a bachelor's "
                                               "degree at"
                            },
                            'graduate_degree_type': {
                                'type': 'string',
                                'description': "A type of graduate degree which the person has"
                            },
                            'graduate_school': {
                                'type': 'string',
                                'description': "Name of school which the person finished a graduate degree at"
                            },
                            'phd_school': {
                                'type': 'string',
                                'description': "Name of a school which the person got a PhD from"
                            },
                            'has_military_or_govt_background': {
                                'type': 'boolean',
                                'description': 'Whether the person has experience or relationship with '
                                               'government agencies, government departments, or '
                                               'branches of the military'
                            },
                            'military_or_govt_background': {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                },
                                "description": 'A list of the names of the government agencies, '
                                               'departments, or branches of the military that are described '
                                               'which the person has worked with or has relationship with. '
                                               'Do not include private companies in this list.'
                            },
                        },
                        'required': ['has_military_or_govt_background'],
                    },
                },
            }
        ]
