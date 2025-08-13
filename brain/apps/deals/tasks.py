import time

from django.apps import apps

from celery import shared_task


@shared_task
def classify_deal_file(pk):
    """Classify deal file and convert it to a more appropriate instance."""

    start_time = time.perf_counter()

    _model = apps.get_registered_model('deals', 'DealFile')
    deal_file = _model.objects.get(pk=pk)

    response = deal_file.classify_file()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'file_uuid': str(deal_file.uuid),
        'response': response,
    }


@shared_task
def load_deal_paper_text(pk):
    """Extract raw text from a paper and save it."""

    start_time = time.perf_counter()

    _model = apps.get_registered_model('deals', 'Paper')
    paper = _model.objects.get(pk=pk)

    paper.load_pdf_text()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'raw_text': paper.raw_text,
    }


@shared_task
def load_deck_text(pk):
    """Extract raw text from a deck and save it."""

    start_time = time.perf_counter()

    _model = apps.get_registered_model('deals', 'Deck')
    deck = _model.objects.get(pk=pk)

    deck.load_pdf_text()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'raw_text': deck.raw_text,
    }


@shared_task
def clean_deal_paper_raw_text(pk):
    """Clean paper raw text and save the cleaned text."""

    start_time = time.perf_counter()

    _model = apps.get_registered_model('deals', 'Paper')
    paper = _model.objects.get(pk=pk)

    response = paper.clean_raw_text()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'response': response,
    }


@shared_task
def clean_deck_raw_text(pk):
    """Clean deck raw text and save the cleaned text."""

    start_time = time.perf_counter()

    _model = apps.get_registered_model('deals', 'Deck')
    deck = _model.objects.get(pk=pk)

    response = deck.clean_raw_text()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {'pk': pk},
        'response': response,
    }
