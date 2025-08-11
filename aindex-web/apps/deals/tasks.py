import time

from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils.timezone import now

from celery import group as task_group
from celery import shared_task
from companies.tasks import pull_company_clinical_studies, pull_company_grants, pull_company_patent_applications
from talents.tasks import pull_founder_data

from aindex.openai import DealAssistant
from aindex.utils import get_country


def _get_deal_assistant_context(deal=None, fields=None):
    """Returns common contextual data related to deal assistant

    Args:
        deal:
            A deal object

        fields:
            A list of fields to include. if not specified all available fields will be retuned.

    Returns:
        dict
    """

    from companies.api.serializers import ClinicalStudySerializer, GrantSerializer, PatentApplicationSerializer
    from talents.api.serializers import FounderSerializer

    context = {}

    fields = fields or [
        'industries',
        'deeptech_signals',
        'strategic_domain_signals',
        'grants',
        'founders',
        'clinical_studies',
        'patent_applications'
    ]

    industry_model = apps.get_registered_model('deals', 'Industry')
    du_signal_model = apps.get_registered_model('deals', 'DualUseSignal')

    if 'industries' in fields:
        context['industries'] = industry_model.objects.values('name')

    if 'deeptech_signals' in fields:
        context['deeptech_signals'] = du_signal_model.objects\
            .filter(category__name__iexact='deeptech')\
            .values('name')

    if 'strategic_domain_signals' in fields:
        context['strategic_domain_signals'] = du_signal_model.objects\
            .filter(category__name__iexact='strategic domain')\
            .values('name')

    if 'grants' in fields:
        context['grants'] = GrantSerializer(deal.company.grants.select_related('company'), many=True).data

    if 'founders' in fields:
        context['founders'] = FounderSerializer(
            deal.company.founders.select_related('company'),
            many=True
        ).data

    if 'clinical_studies' in fields:
        context['clinical_studies'] = ClinicalStudySerializer(
            deal.company.clinical_studies.select_related('company'),
            many=True
        ).data

    if 'patent_application' in fields:
        context['patent_application'] = PatentApplicationSerializer(
            deal.company.patent_applications.select_related('company'),
            many=True
        ).data

    return context


@shared_task
def update_deal_processing_status(pk, status):
    """Update deal processing status."""

    start_time = time.perf_counter()
    deal_model = apps.get_registered_model('deals', 'Deal')
    updated = deal_model.objects.filter(pk=pk).update(processing_status=status)
    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'updated': updated,
    }


@shared_task
def on_deal_processing_error(request, exc, traceback, pk=None):
    if pk:
        deal_model = apps.get_registered_model('deals', 'Deal')
        deal_model.objects.filter(pk=pk).update(processing_status=deal_model.PROCESSING_STATUS.FAILURE)


@shared_task(bind=True)
def ingest_deck(self, pk):
    start_time = time.perf_counter()

    deck_model = apps.get_registered_model('deals', 'Deck')
    deck = deck_model.objects.get(pk=pk)

    ingestion_task_id = self.request.id or ''

    deck_model.objects\
        .filter(pk=pk)\
        .update(
            ingestion_status=deck_model.STARTED,
            ingestion_task_id=ingestion_task_id,
            updated_at=now()
        )

    for page in deck.generate_pdf_pages():
        page.save()

    deck.load_pdf_text()
    deck.ingestion_status = deck_model.SUCCESS
    deck.save()

    end_time = time.perf_counter()
    return {
        'execution_time': end_time - start_time,
        'pdf_parser': f'{deck.pdf_parser.__module__}.{type(deck.pdf_parser).__name__}',
        'parameters': {
            'pk': pk
        }
    }


@shared_task()
def extract_deck_basic_info(pk):
    """Extract basic info from a deck."""

    start_time = time.perf_counter()

    deck_model = apps.get_registered_model('deals', 'Deck')
    founder_model = apps.get_registered_model('talents', 'Founder')

    deck = deck_model.objects.get(pk=pk)

    deck_model.objects.filter(pk=pk).update(ingestion_status=deck_model.STARTED)

    deal = deck.deal

    assistant_context = _get_deal_assistant_context(fields=[
        'industries',
        'deeptech_signals',
        'strategic_domain_signals'
    ])

    assistant = DealAssistant(**assistant_context)

    basic_info = assistant.gen_deck_basic_info(deck)

    company_name = basic_info.get('company_name')
    if company_name:
        deal.company_name = company_name

    website = basic_info.get('website')
    if website:
        validate_url = URLValidator(schemes=['http', 'https'])
        try:
            validate_url(website)
            deal.website = website
        except ValidationError:
            pass

    location = basic_info.get('location') or {}

    country = location.get('country', '')
    if country:
        try:
            country = get_country(country)
            deal.country = country.alpha_2
        except LookupError:
            pass

    state = location.get('state', '')
    if state:
        deal.state = state

    city = location.get('city', '')
    if city:
        deal.city = city

    deal.save()

    # founders info
    founders_list = basic_info.get('founders', [])
    if founders_list:

        founders = []
        for founder in founders_list:
            founder_name = founder.get('name', '')
            founder_title = founder.get('title', '')

            founder, founder_created = founder_model.objects.update_or_create(
                company=deal.company,
                name=founder.get('name', ''),
                defaults={
                    'company': deal.company,
                    'name': founder_name,
                    'title': founder_title,
                }
            )
            founders.append(founder)

    else:
        founders = []

    # pull founders data
    task_group(
        pull_founder_data.si(pk=founder.id) for founder in founders
    ).delay()

    deck_model.objects.filter(pk=pk).update(ingestion_status=deck_model.SUCCESS)

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_info': basic_info
    }


@shared_task()
def extract_deal_dual_use(pk):
    start_time = time.perf_counter()

    deal_model = apps.get_registered_model('deals', 'Deal')
    du_signal_model = apps.get_registered_model('deals', 'DualUseSignal')

    deal = deal_model.objects.get(pk=pk)
    deck = deal.decks.all().order_by('-created_at').first()

    assistant_context = _get_deal_assistant_context(fields=[
        'industries',
        'deeptech_signals',
        'strategic_domain_signals'
    ])

    assistant = DealAssistant(**assistant_context)

    info = assistant.gen_deck_dual_use(
        deal=deal,
        deck=deck,
    )

    # dual use signals
    detected_du_signals = []

    deeptech_areas = info.get('deeptech_areas', [])
    if isinstance(deeptech_areas, str):
        deeptech_areas = [deeptech_areas]

    strategic_domains = info.get('strategic_domains', [])
    if isinstance(strategic_domains, str):
        strategic_domains = [strategic_domains]

    for signal_name in (deeptech_areas + strategic_domains):
        try:
            du_signal = du_signal_model.objects.get(name__iexact=signal_name)
        except du_signal_model.DoesNotExist:
            du_signal = du_signal_model(name=signal_name)
            du_signal.save()

        detected_du_signals.append(du_signal)

    deal.dual_use_signals.add(*detected_du_signals)

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_info': info
    }


@shared_task()
def extract_deal_attributes(pk):

    start_time = time.perf_counter()

    deal_model = apps.get_registered_model('deals', 'Deal')
    industry_model = apps.get_registered_model('deals', 'Industry')

    deal = deal_model.objects.get(pk=pk)
    deck = deal.decks.all().order_by('-created_at').first()

    assistant_context = _get_deal_assistant_context(deal=deal)

    assistant = DealAssistant(
        industries=assistant_context.pop('industries'),
        deeptech_signals=assistant_context.pop('deeptech_signals'),
        strategic_domain_signals=assistant_context.pop('strategic_domain_signals')
    )

    info = assistant.gen_deal_attributes(
        deal=deal,
        deck=deck,
        **assistant_context,
    )

    stage = info.get('stage', '')
    if stage:
        deal.stage = stage

    funding_round_target = info.get('fundraise_target_m')
    if funding_round_target:
        funding_round_target = funding_round_target * 1000000  # from millions
        deal.funding_target = funding_round_target

    has_veteran_founder = info.get('has_veteran_founder')
    if has_veteran_founder is not None:
        deal.has_veteran_founder = has_veteran_founder

    investors_names = info.get('investors', [])
    if investors_names:
        deal.investors_names = investors_names

    problem = info.get('problem')
    if problem:
        deal.auto_problem = problem

    solution = info.get('product_solution')
    if solution:
        deal.auto_solution = solution

    traction = info.get('traction')
    if traction:
        deal.auto_traction = traction

    intellectual_property = info.get('intellectual_property')
    if intellectual_property:
        deal.auto_intellectual_property = intellectual_property

    business_model = info.get('business_model')
    if business_model:
        deal.auto_business_model = business_model

    tam = info.get('tam')
    if tam:
        deal.auto_market_sizing = tam

    competition = info.get('competition')
    if competition:
        deal.auto_competition = competition

    thesis_fit = info.get('thesis_fit')
    if thesis_fit:
        deal.auto_thesis_fit = thesis_fit

    deal.save()

    # industry info
    industries_names = info.get('industries', [])
    if isinstance(industries_names, str):
        industries_names = [industries_names]
    if industries_names:
        industries = industry_model.objects.filter(name__in=industries_names).distinct()
        if industries:
            deal.industries.add(*industries)

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_info': info
    }


@shared_task()
def assess_deal(pk):
    start_time = time.perf_counter()

    deal_model = apps.get_registered_model('deals', 'Deal')

    deal = deal_model.objects.get(pk=pk)
    deck = deal.decks.all().order_by('-created_at').first()

    assistant_context = _get_deal_assistant_context(deal=deal)

    assistant = DealAssistant(
        industries=assistant_context.pop('industries'),
        deeptech_signals=assistant_context.pop('deeptech_signals'),
        strategic_domain_signals=assistant_context.pop('strategic_domain_signals')
    )

    info = assistant.gen_deal_assessment(
        deal=deal,
        deck=deck,
        **assistant_context,
    )

    pros = info.get('pros')
    if pros:
        if isinstance(pros, list):
            pros_text = ''
            for i, pro in enumerate(pros, start=1):
                pros_text += f'{i}. {pro.strip()}\n'
        else:
            pros_text = pros
        deal.auto_pros = pros_text

    cons = info.get('cons')
    if cons:
        if isinstance(cons, list):
            cons_text = ''
            for i, con in enumerate(cons, start=1):
                cons_text += f'{i}. {con.strip()}\n'
        else:
            cons_text = cons
        deal.auto_cons = cons_text

    recommendation = info.get('recommendation')
    if recommendation:
        deal.auto_recommendation = recommendation

    investment_rationale = info.get('investment_rationale')
    if investment_rationale:
        deal.auto_investment_rationale = investment_rationale

    thesis_fit_score = info.get('thesis_fit_score')
    if thesis_fit_score is not None:
        deal.auto_thesis_fit_score = thesis_fit_score

    numeric_score = info.get('numeric_score')
    if numeric_score is not None:
        deal.auto_numeric_score = numeric_score

    non_numeric_score = info.get('non_numeric_score')
    if non_numeric_score:
        deal.auto_non_numeric_score = non_numeric_score

    quality_percentile = info.get('deal_quality_percentile')
    if quality_percentile:
        deal.auto_quality_percentile = quality_percentile

    confidence = info.get('confidence')
    if confidence is not None:
        deal.auto_confidence = confidence

    deal.save()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'result_info': info
    }


@shared_task()
def send_deal_to_affinity(pk):
    """Send deal to affinity."""
    start_time = time.perf_counter()
    deal_model = apps.get_registered_model('deals', 'Deal')
    deal = deal_model.objects.get(pk=pk)
    updated = deal.send_to_affinity()
    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'updated': updated
    }


@shared_task()
def process_deck(pk):
    """Process a new received deck record."""

    start_time = time.perf_counter()
    deck_model = apps.get_registered_model('deals', 'Deck')
    deal_model = apps.get_registered_model('deals', 'Deal')
    deck = deck_model.objects.get(pk=pk)

    deal = deck.deal
    if not deal:
        deal = deck.build_deal()
        deal.save()

        # Update deck
        deck.deal = deal
        deck.save()

    deal_model.objects.filter(pk=deal.pk).update(processing_status=deal.PROCESSING_STATUS.STARTED)

    tasks = (
        extract_deck_basic_info.si(pk=pk)
        | refresh_deal_company_data.si(pk=deal.pk)
        | extract_deal_attributes.si(pk=deal.pk)
        | extract_deal_dual_use.si(pk=deal.pk)
        | assess_deal.si(pk=deal.pk)
        | update_deal_processing_status.si(pk=deal.pk, status=deal.PROCESSING_STATUS.SUCCESS)
    )

    tasks.on_error(on_deal_processing_error.s(pk=deal.pk)).delay()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        }
    }


@shared_task()
def refresh_deal_company_data(pk):
    """Refresh deal company data."""

    start_time = time.perf_counter()
    deal_model = apps.get_registered_model('deals', 'Deal')
    deal = deal_model.objects.get(pk=pk)

    tasks = []

    if deal.company:
        tasks.append(pull_company_grants.si(pk=deal.company.pk, update_company=False))
        tasks.append(pull_company_clinical_studies.si(pk=deal.company.pk))
        tasks.append(pull_company_patent_applications.si(pk=deal.company.pk))

        for founder in deal.company.founders.all():
            tasks.append(pull_founder_data.si(pk=founder.pk))

    task_group(tasks).on_error(on_deal_processing_error.s(pk=pk)).delay()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        }
    }


@shared_task()
def refresh_deal_data(pk):
    """Refresh deal data."""

    start_time = time.perf_counter()
    deal_model = apps.get_registered_model('deals', 'Deal')
    deal = deal_model.objects.get(pk=pk)

    deal_model.objects.filter(pk=pk).update(processing_status=deal_model.PROCESSING_STATUS.STARTED)

    tasks = (
        refresh_deal_company_data.si(pk=pk)
        | assess_deal.si(pk=pk)
        | update_deal_processing_status.si(pk=deal.pk, status=deal.PROCESSING_STATUS.SUCCESS)
    )

    tasks.on_error(on_deal_processing_error.s(pk=deal.pk)).delay()

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        }
    }


@shared_task()
def check_mailbox_new_mail(pk):
    """Check mailbox for new messages."""
    start_time = time.perf_counter()

    mailbox_model = apps.get_registered_model('django_mailbox', 'Mailbox')
    mailbox = mailbox_model.objects.get(pk=pk)
    messages = list(mailbox.get_new_mail())

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'message_count': len(messages)
    }


@shared_task()
def import_deck_from_mailbox_message(pk):
    """Import deck from django-mailbox Message instance."""
    start_time = time.perf_counter()

    message_model = apps.get_registered_model('django_mailbox', 'Message')
    deck_model = apps.get_registered_model('deals', 'Deck')
    message = message_model.objects.get(pk=pk)
    deck = deck_model.from_mailbox.import_message(message)

    if deck:
        created = {
            'deck_id': deck.id
        }
    else:
        created = None

    end_time = time.perf_counter()

    return {
        'execution_time': end_time - start_time,
        'parameters': {
            'pk': pk
        },
        'created': created
    }
