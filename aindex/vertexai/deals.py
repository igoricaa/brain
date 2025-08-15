import copy

from .base import VertexAIAssistant
from .schemas import deals as deals_schema
from .schemas.base import default_deeptech_signals, default_strategic_domain_signals

__all__ = ['DealAssistant']


class DealAssistant(VertexAIAssistant):

    def classify_document(self, text, **kwargs):
        """
        Classify a document type based on text content.

        Args:
            text (str):
                text content of the document.

        Returns:
            genai.types.GenerateContentResponse:
                Response text is JSON object with a ``document_type`` key.
        """

        message = self.render_template('prompts/deal_document_classification.txt', text=text, **kwargs)

        return self.prompt(message, response_schema=deals_schema.document_classification_response)

    def clean_document(self, raw_text, document_type='document', **kwargs):
        """
        Clean raw text from document OCR.

        Args:
            raw_text (str):
                Raw text content of the document.

            document_type (str):
                The file type of the document.

        Returns:
            genai.types.GenerateContentResponse
                Response text is JSON object with a ``text`` key.
        """

        message = self.render_template(
            'prompts/deal_document_cleaning.txt',
            raw_text=raw_text,
            document_type=document_type,
            **kwargs
        )

        return self.prompt(message, response_schema=deals_schema.deck_cleaning_response)

    def clean_deck(self, raw_text, **kwargs):
        """
        Clean raw text from a pitch deck.

        Args:
            raw_text (str):
                Raw text content of the document.

        Returns:
            genai.types.GenerateContentResponse
                Response text is JSON object with a ``text`` key.
        """

        message = self.render_template('prompts/deal_deck_cleaning.txt', raw_text=raw_text, **kwargs)

        return self.prompt(message, response_schema=deals_schema.deck_cleaning_response)

    def gen_deck_basic_info(self, text, **kwargs):
        """
        Extract basic deal info from the deck.

        Args:
            text (str):
                Text content of the pitch deck.

        Returns:
            genai.types.GenerateContentResponse
                Response text is JSON object with a ``text`` key.
        """

        message = self.render_template('prompts/deal_deck_basic_info.txt', text=text, **kwargs)

        return self.prompt(message, response_schema=deals_schema.deck_basic_info_response)

    def gen_deal_attributes(self, deck_text=None, founders=None, grants=None, clinical_studies=None,
                            patent_applications=None, industries=None, deeptech_signals=None,
                            strategic_domain_signals=None, **kwargs):
        """Extract deal attributes from the deck text and other gathered information.

        Args:

            deck_text (str):
                Deck data

            founders (sequence):
                Company founders

            grants (sequence):
                A list of grants awarded to the company

            clinical_studies (sequence):
                Clinical studies linked to the company

            patent_applications (sequence):
                Patent applications by the company

            industries (sequence):
                A list of industries to be used as choices in industry classification.

            deeptech_signals (sequence):
                A list of deeptech areas.

            strategic_domain_signals (sequence):
                A list of strategic domains.

        Returns:
            genai.types.GenerateContentResponse
                Response text is JSON object with a deal attributes.
        """

        # overwrite default industries choices if specified
        response_schema = copy.deepcopy(deals_schema.deal_attributes_response)

        if industries:
            response_schema['properties']['industries']['items']['enum'] = [
                industry['name'] for industry in industries
            ]

        if deeptech_signals:
            response_schema['properties']['deeptech_signals']['items']['enum'] = [
                signal['name'] for signal in deeptech_signals
            ]
        else:
            deeptech_signals = [{'name': signal} for signal in default_deeptech_signals]

        if strategic_domain_signals:
            response_schema['properties']['strategic_domain_signals']['items']['enum'] = [
                signal['name'] for signal in strategic_domain_signals
            ]
        else:
            strategic_domain_signals = [{'name': signal} for signal in default_strategic_domain_signals]

        message = self.render_template(
            'prompts/deal_attributes.txt',
            deck_text=deck_text,
            grants=grants,
            founders=founders,
            clinical_studies=clinical_studies,
            patent_applications=patent_applications,
            deeptech_signals=deeptech_signals,
            strategic_domain_signals=strategic_domain_signals,
            **kwargs,
        )

        return self.prompt(message, response_schema=response_schema)

    def assess_deal(self, deck_text=None, affinity_notes=None, new_affinity_notes=None,
                    research_analysis=None, founders=None, grants=None, patent_applications=None,
                    clinical_studies=None, deal_files=None, new_deal_files=None,
                    library_files=None, last_assessment=None, previous_assessment_count=0, **kwargs):
        """Extract deal attributes from the deck text and other gathered information.

        Args:

            deck_text (str):
                Deck data

            founders (sequence):
                Company founders

            grants (sequence):
                A list of grants awarded to the company

            clinical_studies (sequence):
                Clinical studies linked to the company

            patent_applications (sequence):
                Patent applications by the company

            affinity_notes (sequence):
                A list of notes pulled from affinity.

            new_affinity_notes (sequence):
                A list of new notes since the last assessment pulled from affinity.

            research_analysis (dict):
                Final research analysis.

            deal_files (sequence):
                Text documents relevant to the deal.

            new_deal_files (sequence):
                New documents relevant to the deal since the last assessment.

            library_files (sequence):
                Relevant text documents from the library.

            last_assessment (dict):
                Details from the last assessment. This should include pros, cons and investment_rationale

            previous_assessment_count (int):
                Number of previous assessments done.

        Returns:
            genai.types.GenerateContentResponse
                Response text is JSON object with a deal attributes.
        """

        is_reassessment = bool(last_assessment)
        assessment_number = previous_assessment_count + 1

        message = self.render_template(
            'prompts/deal_assessment.txt',
            deck_text=deck_text,
            affinity_notes=affinity_notes,
            new_affinity_notes=new_affinity_notes,
            research_analysis=research_analysis,
            founders=founders,
            grants=grants,
            patent_applications=patent_applications,
            clinical_studies=clinical_studies,
            deal_files=deal_files,
            new_deal_files=new_deal_files,
            library_files=library_files,
            last_assessment=last_assessment,
            is_reassessment=is_reassessment,
            assesment_number=assessment_number,
            **kwargs,
        )

        return self.prompt(message, response_schema=deals_schema.deal_assessment_response)
