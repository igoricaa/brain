__all__ = ['OpenAIDealAssistantSchema']


class OpenAIDealAssistantSchema:

    def __init__(self, industries=None, deeptech_signals=None, strategic_domain_signals=None):

        self.deck_basic_info_function = 'deck_basic_info'
        self.deck_dual_use_function = 'deck_dual_use'
        self.deal_attributes_function = 'deal_attributes'
        self.deal_assessment_function = 'deal_assessment'

        self.industries = industries or []
        self.deeptech_signals = deeptech_signals or []
        self.strategic_domain_signals = strategic_domain_signals or []

    @property
    def deck_basic_info(self):
        schema = {
            "name": self.deck_basic_info_function,
            "description": "Format the answers in the proprietary format",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {
                        "type": "string",
                        "description": (
                            "The name of the company. This should be a simple title that would likely be the "
                            "title of the company's LinkedIn page, or how people would refer to the company "
                            "in an email. As such, avoid all caps or all lowercase, suffixes such as 'inc' "
                            "or 'co', and nonessential descriptors."
                        ),
                    },
                    "website": {
                        "type": "string",
                        "description": (
                            "The URL of the company website. "
                            "DO NOT report links from Vimeo, YouTube, DocSend, "
                            "bit.ly, or other content platforms as the company website."
                        ),
                    },
                    "location": {
                        "description": "The location of the company",
                        "type": "object",
                        "properties": {
                            "country": {
                                "type": "string",
                                "description": (
                                    "Two-letter country code (ISO 3166-1 alpha-2 code) of the "
                                    "country where the company is located."
                                ),
                            },
                            "state": {
                                "type": "string",
                                "description": "State or region name where the company is located",
                            },
                            "city": {
                                "type": "string",
                                "description": "City name where the company is located.",
                            },
                        },
                    },
                    "founders": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Name of the founder.",
                                },
                                "title": {
                                    "type": "string",
                                    "description": (
                                        "Titles of the founder at the current company, eg. CEO, CTO, etc. "
                                        "Don't include titles such as 'Founder' or 'Co-founder', as that is "
                                        "already assumed from the presence on this list. "
                                        "If no title for a given founder, include an empty string. "
                                        "Also, don't include titles such as 'Dr', 'MBA', 'Mr', etc."
                                    ),
                                },
                            },
                        },
                        "description": "A list of names and titles of the company founders",
                    },
                },
                "required": ["company_name", "founders"],
            },
        }

        return [
            {
                "type": "function",
                "function": schema,
            }
        ]

    @property
    def deal_attributes(self):
        schema = {
            "name": self.deal_attributes_function,
            "description": "Format the answers in the proprietary format",
            "parameters": {
                "type": "object",
                "properties": {
                    "industries": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [industry['name'] for industry in self.industries],
                        },
                        "description": (
                            "Industry description(s) that apply to the company. You can include up to three."
                        ),
                    },
                    "stage": {
                        "type": "string",
                        "description": "The stage of the current fundraise",
                        "enum": [
                            "pre-seed",
                            "seed",
                            "seed+",
                            "series-a",
                            "series-b",
                            "series-c",
                            "beyond-series-c",
                        ],
                    },
                    "fundraise_target_m": {
                        "type": "integer",
                        "description": "The amount of money, in USD millions, that the company is seeking",
                    },
                    "has_veteran_founder": {
                        "type": "boolean",
                        "description": (
                            "Is there evidence that the company has at least one founder with past "
                            "military experience?"
                        ),
                    },
                    "investors": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of the names of investors in the company.",
                    },
                    "problem": {
                        "type": "string",
                        "description": "The problem that is the company solving for its customers.",
                    },
                    "product_solution": {
                        "type": "string",
                        "description": (
                            "The product that the company offers to solve the aforementioned problem, "
                            "and how does it solve this problem."
                        ),
                    },
                    "traction": {
                        "type": "string",
                        "description": "Customer traction that the company received, if any.",
                    },
                    "intellectual_property": {
                        "type": "string",
                        "description": "Intellectual property secured by the company.",
                    },
                    "business_model": {
                        "type": "string",
                        "description": "The company's business model.",
                    },
                    "tam": {
                        "type": "string",
                        "description": "TAM or total market size.",
                    },
                    "competition": {
                        "type": "string",
                        "description": (
                            "How the company position itself versus competitors."
                            "What does the company view as its competitive advantage? "
                            "Who are the competitors, if any."
                        ),
                    },
                    "thesis_fit": {
                        "type": "string",
                        "description": "An analysis of whether this company aligns with AIN's thesis.",
                    },
                },
                "required": ["stage"],
            },
        }

        return [
            {
                "type": "function",
                "function": schema,
            }
        ]

    @property
    def deck_dual_use(self):
        schema = {
            "name": self.deck_dual_use_function,
            "description": "Format the answers to dual-use questions in the proprietary dual-use format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deeptech_areas": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [signal['name'] for signal in self.deeptech_signals],
                        },
                        "description": "The deeptech technology(s) that the company is actively "
                        "developing. Very often, there will be no deeptech areas, "
                        "so this will be an empty list.",
                    },
                    "strategic_domains": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [signal['name'] for signal in self.strategic_domain_signals],
                        },
                        "description": (
                            "The strategic domain(s) in which the company is directly involved. "
                            "Very often, there will be no strategic domain, so this will be an empty list."
                        ),
                    },
                    "grants": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of the granting agencies from which the company has "
                                       "received grants.",
                    },
                    "government_relationships": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of the names of the government agencies, "
                        "departments, or branches of the military that are described "
                        "in the pitch deck as customers or partners. "
                        "Do not include private companies in this list.",
                    },
                    "has_civilian_use_cases": {
                        "type": "boolean",
                        "description": "Does the technology have likely civilian use cases?",
                    },
                },
                "required": [
                    "has_civilian_use_cases",
                ],
            },
        }

        return [
            {
                "type": "function",
                "function": schema,
            }
        ]

    @property
    def deal_assessment(self):

        schema = {
            "name": self.deal_assessment_function,
            "description": "Format the answers to dual-use questions in the proprietary dual-use format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pros": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of reasons why this would be a good investment.",
                    },
                    "cons": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of reasons why this would not be a good investment.",
                    },
                    "investment_rationale": {
                        "type": "string",
                        "description": "A brief explanation of the investment rationale.",
                    },
                    "non_numeric_score": {
                        "type": "string",
                        "enum": ["excellent", "good", "average", "below average"],
                        "description": (
                            "Based on your analysis of the pros and cons, assign a qualitative score "
                            "to the startup."
                        ),
                    },
                    "numeric_score": {
                        "type": "number",
                        "description": (
                            "Use the logistic regression model to calculate a probability "
                            "score indicating the likelihood of the company reaching the "
                            "$5M funding threshold."
                        ),
                    },
                    "thesis_fit_score": {
                        "type": "number",
                        "description": (
                            "Analysis of the company based on AIN's investment thesis. "
                            "This score should be a continuous number between 0 and 1, "
                            "where 1 indicates perfect investment thesis fit and 0 "
                            "indicates no investment thesis fit."
                        ),
                    },
                    "deal_quality_percentile": {
                        "type": "string",
                        "enum": ["top 1%", "top 5%", "top 10%", "top 20%", "top 50%"],
                        "description": (
                            "Your assessment of the quality of the opportunity in terms "
                            "of where it would sit in a ranked-choice list. "
                            "For instance, 'top 1%' means that this is a one-in-a-hundred "
                            "quality of deal and should be treated with very high "
                            "priority. By contrast, 'top 50%' would indicate a deal that "
                            "is good but should be process behind some other deals. "
                        ),
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["high", "low"],
                        "description": "Based on missing data.",
                    },
                },
                "required": [
                    "pros",
                    "cons",
                    "recommendation",
                    "investment_rationale",
                    "thesis_fit_score",
                    "deal_quality_percentile",
                    "numeric_score",
                    "non_numeric_score",
                    "confidence",
                ],
            },
        }

        return [
            {
                "type": "function",
                "function": schema,
            }
        ]
