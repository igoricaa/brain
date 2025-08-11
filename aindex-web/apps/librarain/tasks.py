import time

from django.apps import apps
from django.utils.timezone import now

from celery import shared_task


@shared_task()
def pull_semantic_scholar_updates():
    """Update documents from all semantic scholar search criteria stored in the database.

    Returns:
        dict
    """

    start_time = time.perf_counter()

    search_model = apps.get_registered_model('librarain', 'SemanticScholarSearch')

    for search in search_model.objects.all():
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
    """Update documents from the specified semantic scholar search criterion stored in the database.

    Args:
        pk (int):
            The primary key of the search criteria.

    Returns:
        dict
    """
    start_time = time.perf_counter()

    search_model = apps.get_registered_model('librarain', 'SemanticScholarSearch')

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

    search_model = apps.get_registered_model('librarain', 'ArxivSearch')

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

    search_model = apps.get_registered_model('librarain', 'ArxivSearch')

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
    max_retries=5,
    default_retry_delay=30,
)
def save_document_src_file(pk):
    """Download and save document file from the external source URL."""

    start_time = time.perf_counter()

    document_model = apps.get_registered_model('librarain', 'Document')
    document = document_model.objects.get(pk=pk)
    saved = document.save_src_file()

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
def save_document_text(pk):
    """Extract document text from file."""

    start_time = time.perf_counter()

    document_model = apps.get_registered_model('librarain', 'Document')
    document = document_model.objects.get(pk=pk)
    text = document.extract_pdf_text()
    document_model.objects.filter(pk=pk).update(text=text, updated_at=now())

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'text': text,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=80,
    rate_limit='50/s',
)
def update_document_embedding(pk):
    """Update document embedding."""

    start_time = time.perf_counter()

    document_model = apps.get_registered_model('librarain', 'Document')
    document = document_model.objects.get(pk=pk)
    embedding = document.generate_embedding()
    document_model.objects.filter(pk=pk).update(embedding=embedding, updated_at=now())

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'embedding': embedding,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=30,
)
def load_document_sections(pk):
    """Extract document section and save them in the database."""

    start_time = time.perf_counter()

    document_model = apps.get_registered_model('librarain', 'Document')
    document = document_model.objects.get(pk=pk)
    text = document.load_text_sections()
    document_model.objects.filter(pk=pk).update(text=text, updated_at=now())

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'text': text,
    }


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=True,
    rate_limit='50/s',
)
def update_document_section_embedding(pk):
    """Update document section embedding."""

    start_time = time.perf_counter()

    section_model = apps.get_registered_model('librarain', 'DocumentSection')
    section = section_model.objects.get(pk=pk)
    embedding = section.generate_embedding()
    section_model.objects.filter(pk=pk).update(embedding=embedding, updated_at=now())

    end_time = time.perf_counter()
    execution_time = end_time - start_time

    return {
        'execution_time': execution_time,
        'parameters': {
            'pk': pk,
        },
        'embedding': embedding,
    }
