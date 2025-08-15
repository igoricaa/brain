import json

from .assistant_schemas import OpenAIDealAssistantSchema
from .base import OpenAIAssistant

__all__ = ['DealAssistant']


class DealAssistant(OpenAIAssistant):

    DEFAULT_INDUSTRIES = ["ai/ml", "consumer", "defense tech", "design", "dev tools", "education", "fintech",
                          "food & beverage", "gaming", "hardware", "healthcare", "infrastructure",
                          "life sciences", "manufacturing", "media & entertainment", "mobile", "music",
                          "sales & marketing", "security", "space", "sustainability/energy", "transportation"]

    DEFAULT_DEEPTECH_SIGNALS = ['advanced materials', 'artificial intelligence & machine learning',
                                'augmented reality (ar) and virtual reality (vr)',
                                'bio-derived energy storage', 'computing chips', 'cybersecurity',
                                'directed energy', 'drones and autonomous vehicles',
                                'energy and resource management', 'internet of things (iot)',
                                'quantum computing', 'renewable energy generation & storage',
                                'robotic process automation (rpa)',
                                'secure edge/iot computing', 'voice and natural language processing (nlp)',
                                'wearable technology']

    DEFAULT_STRATEGIC_DOMAINS = ['aerospace', 'analytics and decision support',
                                 'biodefense detection & containment', 'chips',
                                 'digital identity and access management',
                                 'electronic health records', 'geospatial analysis and mapping', 'maritime',
                                 'microelectronics quantifiable assurance', 'supply chain resilience',
                                 'sustainability', 'training & workforce development',
                                 'trauma-oriented healthcare']

    def __init__(self, industries=None, deeptech_signals=None, strategic_domain_signals=None, **kwargs):

        super().__init__(**kwargs)

        self.industries = industries or [{'name': industry} for industry in self.DEFAULT_INDUSTRIES]
        self.deeptech_signals = deeptech_signals or [
            {'name': signal}
            for signal in self.DEFAULT_DEEPTECH_SIGNALS
        ]
        self.strategic_domain_signals = strategic_domain_signals or [
            {'name': signal}
            for signal in self.DEFAULT_STRATEGIC_DOMAINS
        ]

        # Assistant Schema
        self.assistant_schema = OpenAIDealAssistantSchema(
            industries=self.industries,
            deeptech_signals=self.deeptech_signals,
            strategic_domain_signals=self.strategic_domain_signals,
        )

    def render_template(self, name, **context):
        default_context = {
            'industries': self.industries,
            'deeptech': self.deeptech_signals,
            'strategic_domain_signals': self.strategic_domain_signals,
        }

        template = self.jinja2env.get_template(name)
        return template.render({**default_context, **context})

    def gen_deck_basic_info(self, deck=None, **kwargs):
        """Extract basic deal info from the deck.

        Args:
            deck (dict):
                Deck data as dict or the UUID of a specific deck.

        Returns:
            dict
        """

        prompt_message = self.render_template('deck_basic_info_prompt.txt', deck=deck, **kwargs)
        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.deck_basic_info,
        )
        attributes = json.loads(response.tool_calls[0].function.arguments)
        return attributes

    def gen_deal_attributes(self, deal, deck=None, grants=None, founders=None, clinical_studies=None,
                            patent_applications=None, **kwargs):
        """Extract deal attributes from the deck text and other gathered information.

        Args:
            deal (dict):
                Deal data as dict or the UUID of a specific deal.

            deck (dict):
                Deck data

            grants (sequence):
                A list of grants awarded to the company

            founders (sequence):
                Company founders

            clinical_studies (sequence):
                Clinical studies linked to the company

            patent_applications (sequence):
                Patent applications by the company

        Returns:
            dict
        """

        prompt_message = self.render_template(
            'deal_attributes_prompt.txt',
            deal=deal,
            deck=deck,
            grants=grants,
            founders=founders,
            clinical_studies=clinical_studies,
            patent_applications=patent_applications,
            **kwargs,
        )

        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.deal_attributes,
        )
        attributes = json.loads(response.tool_calls[0].function.arguments)
        return attributes

    def gen_deck_dual_use(self, deck, **kwargs):
        """Generate dual use signals on the deck.

        Args:
            deck (dict):
                Deck data as dict.

        Returns:
            dict
        """

        prompt_message = self.render_template('deck_dual_use_prompt.txt', deck=deck, **kwargs)
        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.deck_dual_use,
        )
        dual_use = json.loads(response.tool_calls[0].function.arguments)
        return dual_use

    def gen_deal_assessment(self, deal, deck=None, grants=None, founders=None, clinical_studies=None,
                            patent_applications=None, **kwargs):
        """Perform deal assessment.

        Args:
            deal (dict):
                Deal data as dict or the UUID of a specific deal.

            deck (dict):
                Deck data

            grants (sequence):
                A list of grants awarded to the company

            founders (sequence):
                Company founders

            clinical_studies (sequence):
                Clinical studies linked to the company

            patent_applications (sequence):
                Patent applications by the company

        Returns:
            dict
        """

        prompt_message = self.render_template(
            'deal_assessment_prompt.txt',
            deal=deal,
            deck=deck,
            grants=grants,
            founders=founders,
            clinical_studies=clinical_studies,
            patent_applications=patent_applications,
            **kwargs,
        )

        response = self.chat_stream.submit(
            prompt_message,
            tools=self.assistant_schema.deal_assessment,
        )
        assessment = json.loads(response.tool_calls[0].function.arguments)
        return assessment
