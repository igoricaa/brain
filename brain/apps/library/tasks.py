import time

from django.apps import apps
from django.utils.timezone import now

from celery import shared_task


@shared_task()
def pull_semantic_scholar_updates():
    """Pull papers from all semantic scholar search criteria stored in the database.

    Returns:
        dict
    """

    start_time = time.perf_counter()

    search_model = apps.get_registered_model('library', 'SemanticScholarSearch')

    for search in search_model.objects.only('pk'):
        pull_semantic_scholar_search.delay(pk=search.pk)

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
)
def pull_semantic_scholar_search(pk):
    """Pull papers from the specified semantic scholar search criterion stored in the database.

    Args:
        pk (int):
            The primary key of the search criteria.

    Returns:
        dict
    """
    start_time = time.perf_counter()

    search_model = apps.get_registered_model('library', 'SemanticScholarSearch')

    semantic_scholar = search_model.objects.get(pk=pk)
    results = semantic_scholar.pull_papers()

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'response': results.raw_data,
    }


@shared_task()
def pull_arxiv_updates():
    """Update documents from all arXiv search criteria stored in the database.

    Returns:
        dict
    """

    start_time = time.perf_counter()

    search_model = apps.get_registered_model('library', 'ArxivSearch')

    for search in search_model.objects.all():
        pull_arxiv_search.delay(pk=search.pk)

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
)
def pull_arxiv_search(pk):
    """Update documents from the specified arXiv search criterion stored in the database.

    Args:
        pk (int):
            The primary key of the search criteria.

    Returns:
        dict
    """
    start_time = time.perf_counter()

    search_model = apps.get_registered_model('library', 'ArxivSearch')

    arxiv = search_model.objects.get(pk=pk)
    results = arxiv.pull_papers()
    raw_results = [result._raw for result in results]

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'response': raw_results,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
)
def download_file_src(pk):
    """Download and save file from the external source URL."""

    start_time = time.perf_counter()

    file_model = apps.get_registered_model('library', 'File')
    _file = file_model.objects.get(pk=pk)
    saved = _file.save_src_file()

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'saved': saved,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
    rate_limit='10/s',
)
def extract_paper_text(pk, app_label='library', model_name='paper'):
    """Extract paper text from file."""

    start_time = time.perf_counter()

    paper_model = apps.get_registered_model(app_label, model_name)
    paper = paper_model.objects.get(pk=pk)
    text = paper.load_pdf_text()
    paper.signal_text_extraction_done()

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
            'app_label': app_label,
            'model_name': model_name,
        },
        'text': text,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=80,
    rate_limit='50/s',
)
def update_paper_embedding(pk, app_label='library', model_name='paper'):
    """Update document embedding."""

    start_time = time.perf_counter()

    document_model = apps.get_registered_model(app_label, model_name)
    document = document_model.objects.get(pk=pk)
    embedding = document.generate_embedding()
    document_model.objects.filter(pk=pk).update(embedding=embedding, updated_at=now())

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {'pk': pk, 'app_label': app_label, 'model_name': model_name},
        'embedding': embedding,
    }
