from .base import default_deeptech_signals, default_industries_names, default_strategic_domain_signals

document_classification_response = {
    'type': 'object',
    'properties': {
        'document_type': {
            'type': 'string',
            'enum': ['deck', 'paper', 'contract', '']
        },
    },
    'required': ['document_type'],
}


document_cleaning_response = {
    'type': 'object',
    'properties': {
        'text': {
            'type': 'string',
            'description': 'Cleaned text.'
        },
    },
    'required': ['text'],
}


deck_cleaning_response = document_cleaning_response


deck_basic_info_response = {
    'type': 'object',
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
            "nullable": True,
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
                    "bio": {
                        'type': "string",
                        'description': "founder's summary biography if available.",
                    },
                },
            },
            "description": "A list of names and titles of the company founders",
        },
    },
    "required": ["company_name", "founders"],
}


deal_attributes_response = {
    "type": "object",
    "properties": {
        "industries": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": default_industries_names,
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
        "investors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "A list of the names of investors in the company.",
        },
        "deeptech_signals": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": default_deeptech_signals,
            },
            "description": "The deeptech technology(s) that the company is actively "
                           "developing. Very often, there will be no deeptech areas, "
                           "so this will be an empty list.",
        },
        "strategic_domain_signals": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": default_strategic_domain_signals,
            },
            "description": (
                "The strategic domain(s) in which the company is directly involved. "
                "Very often, there will be no strategic domain, so this will be an empty list."
            ),
        },
        "govt_relationships": {
            "type": "array",
            "items": {"type": "string"},
            "description": "A list of the names of the government agencies, "
                           "departments, or branches of the military that are described "
                           "in the pitch deck as customers or partners. "
                           "Do not include private companies in this list.",
        },
        "has_civilian_use": {
            "type": "boolean",
            "description": "Does the technology have likely civilian use cases?",
        },
    },
    "required": ["stage", "has_civilian_use_cases"],
}


deal_assessment_response = {
    "type": "object",
    "properties": {
        "problem_solved": {
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
        "customer_traction": {
            "type": "string",
            "description": "Customer traction that the company received, if any.",
        },
        "business_model": {
            "type": "string",
            "description": "The company's business model.",
        },
        "intellectual_property": {
            "type": "string",
            "description": "Intellectual property secured by the company.",
        },
        "tam": {
            "type": "string",
            "description": "Company's estimate of TAM or total market size.",
        },
        "competition": {
            "type": "string",
            "description": (
                "How the company position itself versus competitors."
                "What does the company view as its competitive advantage? "
                "Who are the competitors, if any."
            ),
        },
        "thesis_fit_evaluation": {
            "type": "string",
            "description": "An analysis of whether this company aligns with AIN's thesis.",
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
        "quality_percentile": {
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
    },
    "required": [
        "pros",
        "cons",
        "investment_rationale",
        "thesis_fit_score",
        "quality_percentile",
    ],
}
