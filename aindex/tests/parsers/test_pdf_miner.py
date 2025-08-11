from pathlib import Path

from aindex.parsers.pdf_miner import PDFMinerParser


def test_pdf_deck_parser():
    path = Path(__file__).parent.parent / 'test_data/minimal.pdf'
    parser = PDFMinerParser(path)

    assert isinstance(parser.page_count, int)

    for page in parser.read_pages():
        assert isinstance(page, dict)
        assert 'page_number' in page
        assert 'text' in page
