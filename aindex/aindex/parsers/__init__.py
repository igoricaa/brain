from ..conf import settings
from .documentai import DocAIPDFParser
from .pdf_miner import PDFMinerParser

PDF_PARSERS_LOOKUP = {
    'documentai': DocAIPDFParser,
    'pdfminer': PDFMinerParser
}


def get_pdf_parser_class(name=None):
    """Get PDF parser class with the specified name.

    If name is not provided the one specified in `default_pdf_parser` setting will be returned.

    Args:
        name (str):
            The name of the PDF parser. Choices include `'documentai'` and `'pdfminer'`
     """
    if name is None:
        name = settings.default_pdf_parser

    return PDF_PARSERS_LOOKUP[name]
