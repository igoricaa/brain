import argparse
import random
import string
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

# Companies
from companies.models import (
    Advisor,
    Company,
    CompanyAdvisor,
    Founder,
    Founding,
    FundingStage,
    FundingType,
    IPOStatus,
    Industry,
    TechnologyType,
)
from companies.models.base import NUM_EMPLOYEES_RANGE_CHOICES, REVENUE_RANGE_CHOICES
from companies.models.clinical_studies import ClinicalStudy
from companies.models.grants import Grant
from companies.models.patents import PatentApplication

# Deals
from deals.models import Deal, DraftDeal
from deals.models.assesments import DealAssessment
from deals.models.base import (
    DealAssessmentConfidence,
    DealFollowUp,
    DealNonNumericScore,
    DealQualityPercentile,
    DealStatus,
    DualUseCategory,
    DualUseSignal,
)
from deals.models.missed_deals import MissedDeal

# Library
from library.models.base import Category as LibraryCategory
from library.models.base import Source as LibrarySource
from library.models.documents import DocumentType
from library.models.files import File as LibraryFile
from library.models.papers import Paper as LibraryPaper
from library.models.papers import PaperAuthor

# Socialgraph
from socialgraph.models import Education, Experience, Profile
from deals.models.files import Deck


def _slug(n: int = 6) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))


class Command(BaseCommand):
    help = "Seed realistic dummy data across Brain v2 (idempotent, no external I/O)."

    def add_arguments(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument('--seed', type=int, default=42, help='Random seed for reproducibility')
        parser.add_argument('--batch', type=str, default=None, help='Batch tag used in generated names/codes')
        parser.add_argument('--companies', type=int, default=30, help='Number of companies to create')
        parser.add_argument('--deals', type=int, default=60, help='Number of deals to create (non-draft)')
        parser.add_argument('--drafts', type=int, default=15, help='Number of draft deals to create')
        parser.add_argument('--profiles', type=int, default=50, help='Number of generic profiles to create')
        parser.add_argument('--with-library-files', action='store_true', help='Also create library files (no uploads)')
        parser.add_argument('--flush-dummy', action='store_true', help='Delete previously created dummy data for the batch')

    def handle(self, *args, **options):
        random.seed(options['seed'])

        batch = options['batch'] or _slug(8)
        self.stdout.write(self.style.WARNING(f"Dummy data batch: {batch}"))

        if options['flush_dummy']:
            self._flush_dummy(batch=batch)
            self.stdout.write(self.style.SUCCESS('Flushed dummy data'))
            return

        with transaction.atomic():
            user_admin, user_regular = self._ensure_users()
            self._seed_taxonomies(batch=batch)
            profiles, founders, advisors = self._seed_socialgraph(batch=batch, count=options['profiles'])
            companies = self._seed_companies(
                batch=batch,
                count=options['companies'],
                founders=founders,
                advisors=advisors,
            )

            self._seed_company_artifacts(batch=batch, companies=companies)
            deals = self._seed_deals(
                batch=batch,
                companies=companies,
                user=user_regular,
                deal_count=options['deals'],
                draft_count=options['drafts'],
            )
            self._seed_deal_assessments(batch=batch, deals=deals)
            self._seed_missed_deals(batch=batch, companies=companies, user=user_regular)
            self._seed_library(batch=batch, deals=deals, with_files=options['with_library_files'])

        self.stdout.write(self.style.SUCCESS('Dummy data seeding completed.'))

    # ---------- Cleanup ----------
    def _flush_dummy(self, batch: str):
        # Taxonomies (safe unique code prefix)
        for model in [TechnologyType, FundingType, FundingStage, IPOStatus, Industry, DualUseCategory, DualUseSignal, DocumentType, LibraryCategory, LibrarySource]:
            model.objects.filter(code__startswith=f'dummy-{batch}').delete()

        # Users
        User = get_user_model()
        User.objects.filter(username__startswith=f'dummy_{batch}_').delete()
        # Also remove standard seed users
        User.objects.filter(username__in=['dummy_admin', 'dummy_user']).delete()

        # Library (files/papers) – limit by source/code/name markers
        LibraryFile.objects.filter(tags__contains=[f'dummy:{batch}']).delete()
        LibraryPaper.objects.filter(title__icontains=f'[{batch}]').delete()

        # Deals and attachments
        try:
            from deals.models.files import Deck
        except Exception:
            Deck = None
        if Deck:
            Deck.objects.filter(title__icontains=f'[{batch}]').delete()
        DealAssessment.objects.filter(tags__contains=[f'dummy:{batch}']).delete()
        Deal.objects.filter(name__icontains=f'[{batch}]').delete()
        MissedDeal.objects.filter(name__icontains=f'[{batch}]').delete()

        # Company artifacts
        PatentApplication.objects.filter(number__startswith=f'D-{batch}-').delete()
        ClinicalStudy.objects.filter(nct_id__startswith=f'D{batch}').delete()
        Grant.objects.filter(sbir_id__startswith=f'{batch}-').delete()

        # Socialgraph
        for model in [Founder, Advisor, Profile]:
            model.objects.filter(name__icontains=f'[{batch}]').delete()

        # Companies (heuristic by website/name marker)
        CompanyAdvisor.objects.filter(company__name__icontains=f'[{batch}]').delete()
        Founding.objects.filter(company__name__icontains=f'[{batch}]').delete()
        Company.objects.filter(name__icontains=f'[{batch}]').delete()

    # ---------- Users ----------
    def _ensure_users(self):
        User = get_user_model()
        admin, _ = User.objects.get_or_create(
            username='dummy_admin', defaults={'email': 'dummy_admin@example.com', 'is_staff': True, 'is_superuser': True}
        )
        if not admin.password:
            admin.set_password('dummy1234')
            admin.save(update_fields=['password'])

        user, _ = User.objects.get_or_create(
            username='dummy_user', defaults={'email': 'dummy_user@example.com', 'is_staff': False, 'is_superuser': False}
        )
        if not user.password:
            user.set_password('dummy1234')
            user.save(update_fields=['password'])

        return admin, user

    # ---------- Taxonomies ----------
    def _seed_taxonomies(self, batch: str):
        def mk_codes(items):
            out = []
            for i, name in enumerate(items):
                code = f'dummy-{batch}-{i}-{_slug(3)}'
                out.append((name, code))
            return out

        tech_types = mk_codes(['AI/ML', 'Robotics', 'Biotech', 'Cybersecurity', 'Aerospace', 'Energy'])
        for name, code in tech_types:
            # name is unique -> key by name for cross-batch idempotence
            TechnologyType.objects.get_or_create(name=name, defaults={'code': code})

        funding_types = mk_codes(['Grant', 'Equity', 'Convertible Note', 'SAFE', 'Debt', 'Crowdfunding', 'Series', 'Seed'])
        for name, code in funding_types:
            FundingType.objects.get_or_create(name=name, defaults={'code': code})

        stages = mk_codes(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'])
        for name, code in stages:
            FundingStage.objects.get_or_create(name=name, defaults={'code': code})

        ipo_statuses = mk_codes(['Private', 'Public', 'Delisted', 'Acquired'])
        for name, code in ipo_statuses:
            IPOStatus.objects.get_or_create(name=name, defaults={'code': code})

        industries = mk_codes(['Defense', 'Healthcare', 'Fintech', 'Aerospace', 'Energy', 'Manufacturing', 'Autonomy', 'Communications', 'Security', 'Materials', 'Education', 'Logistics'])
        for name, code in industries:
            Industry.objects.get_or_create(name=name, defaults={'code': code})

        du_categories = mk_codes(['Autonomy', 'Sensing', 'Communications', 'Materials', 'Health', 'Space'])
        cat_objs = []
        for name, code in du_categories:
            obj, _ = DualUseCategory.objects.get_or_create(code=code, defaults={'name': name})
            cat_objs.append(obj)

        # Signals: 20 signals mapped across categories
        for i in range(20):
            cat = random.choice(cat_objs)
            name = f'{cat.name} Signal {i+1}'
            code = f'dummy-{batch}-dusig-{i}-{_slug(2)}'
            DualUseSignal.objects.get_or_create(code=code, defaults={'name': name, 'category': cat})

        # Library taxonomy
        lib_categories = mk_codes(['research', 'marketing', 'compliance', 'technical'])
        for name, code in lib_categories:
            LibraryCategory.objects.get_or_create(code=code, defaults={'name': name})

        doc_types = mk_codes(['pitch-deck', 'whitepaper', 'datasheet', 'report', 'case-study'])
        for name, code in doc_types:
            DocumentType.objects.get_or_create(code=code, defaults={'name': name})

        sources = mk_codes(['user-upload', 'vendor', 'gov', 'arxiv'])
        for name, code in sources:
            LibrarySource.objects.get_or_create(code=code, defaults={'name': name})

    # ---------- Socialgraph ----------
    def _seed_socialgraph(self, batch: str, count: int):
        first_names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn']
        last_names = ['Smith', 'Johnson', 'Lee', 'Brown', 'Davis', 'Miller', 'Garcia', 'Martinez', 'Wilson', 'Anderson']
        locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA']

        profiles = []
        founders = []
        advisors = []

        for i in range(count):
            name = f"{random.choice(first_names)} {random.choice(last_names)} [{batch}]"
            prof, _ = Profile.objects.get_or_create(
                name=name,
                defaults={
                    'location': random.choice(locations),
                    'website': '',
                    'has_military_or_govt_background': random.choice([True, False, None]),
                },
            )
            profiles.append(prof)

        # Create founders/advisors as specializations
        for i in range(max(1, count // 2)):
            name = f"Founder {i+1} [{batch}]"
            f, _ = Founder.objects.get_or_create(name=name, defaults={'location': random.choice(locations)})
            founders.append(f)

        for i in range(max(1, count // 3)):
            name = f"Advisor {i+1} [{batch}]"
            a, _ = Advisor.objects.get_or_create(name=name, defaults={'location': random.choice(locations)})
            advisors.append(a)

        return profiles, founders, advisors

    # ---------- Companies ----------
    def _seed_companies(self, batch: str, count: int, founders, advisors):
        tech_types = list(TechnologyType.objects.all())
        industries = list(Industry.objects.all())
        stages = list(FundingStage.objects.all())

        companies = []
        for i in range(count):
            name = f"DummyCo {i+1} [{batch}]"
            website = f"https://c{i+1}-{batch}.example.com"

            company, created = Company.objects.get_or_create(
                website=website,
                defaults={
                    'name': name,
                    'summary': 'An innovative dual-use startup.',
                    'linkedin_url': '',
                    'year_founded': random.randint(2008, 2023),
                    'company_type': random.choice(['for_profit', 'non_profit']),
                    'operating_status': random.choice(['active', 'closed']),
                    'hq_country': 'US',
                    'hq_state_name': random.choice(['CA', 'NY', 'TX', 'MA', 'WA']),
                    'hq_city_name': random.choice(['San Francisco', 'New York', 'Austin', 'Boston', 'Seattle']),
                },
            )

            # M2M
            if tech_types:
                company.technology_type = random.choice(tech_types)
            company.save()

            inds = random.sample(industries, k=min(len(industries), random.randint(1, 3))) if industries else []
            if inds:
                company.industries.add(*inds)

            # Founders (1–3)
            if founders:
                for f in random.sample(founders, k=min(len(founders), random.randint(1, 3))):
                    Founding.objects.get_or_create(
                        company=company,
                        founder=f,
                        defaults={
                            'title': random.choice(['CEO', 'CTO', 'Co-Founder', 'Founder']),
                            'prior_founding_count': random.choice([0, 1, 2, None]),
                        },
                    )

            # Advisors (0–2)
            if advisors and random.random() < 0.8:
                for a in random.sample(advisors, k=min(len(advisors), random.randint(0, 2))):
                    CompanyAdvisor.objects.get_or_create(company=company, advisor=a)

            # Optional realism: ranges, metrics, signals, investors
            self._enrich_company_optional(company)

            companies.append(company)

        return companies

    def _enrich_company_optional(self, company: Company):
        """Populate optional but useful fields for realism without side effects."""
        # Helper to build PostgreSQL range values (psycopg 3)
        try:
            from psycopg.types.range import Range
        except Exception:  # pragma: no cover
            Range = None  # If unavailable, skip setting ranges

        update_fields = []

        # Employees range
        if Range and random.random() < 0.9:
            low, high = random.choice(list(NUM_EMPLOYEES_RANGE_CHOICES.keys()))
            company.num_employees_range = Range(low, high, '[]')
            update_fields.append('num_employees_range')

        # Revenue range
        if Range and random.random() < 0.7:
            rlow, rhigh = random.choice(list(REVENUE_RANGE_CHOICES.keys()))
            rlow_d = None if rlow is None else Decimal(rlow)
            rhigh_d = None if rhigh is None else Decimal(rhigh)
            company.revenue_range = Range(rlow_d, rhigh_d, '[]')
            update_fields.append('revenue_range')

        # Valuation range + date
        if Range and random.random() < 0.5:
            # Construct a plausible range in USD
            base = random.choice([50_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000])
            spread = random.choice([50_000_000, 150_000_000, 300_000_000])
            vlow = Decimal(base)
            vhigh = Decimal(base + spread)
            company.valuation_range = Range(vlow, vhigh, '[]')
            company.valuation_date = date(random.randint(2020, 2024), random.randint(1, 12), random.randint(1, 28))
            update_fields.extend(['valuation_range', 'valuation_date'])

        # Hiring and HR signals
        if random.random() < 0.6:
            company.actively_hiring = random.choice([True, False])
            update_fields.append('actively_hiring')
        if random.random() < 0.2:
            company.last_layoff_date = date(random.randint(2020, 2024), random.randint(1, 12), random.randint(1, 28))
            update_fields.append('last_layoff_date')
        if random.random() < 0.4:
            company.last_key_employee_change = date(random.randint(2021, 2025), random.randint(1, 12), random.randint(1, 28))
            update_fields.append('last_key_employee_change')

        # Investors
        all_investors = ['Sequoia', 'a16z', 'USAF', 'NSF', 'YC', 'Founders Fund', 'Lockheed Ventures', 'Bessemer']
        inv = random.sample(all_investors, k=random.randint(0, min(3, len(all_investors))))
        company.investors_names = inv
        company.num_investors = len(inv) if inv else None
        company.num_lead_investors = random.choice([None, 0, 1])
        update_fields.extend(['investors_names', 'num_investors', 'num_lead_investors'])

        # Crunchbase-esque metrics
        company.cb_rank = random.randint(1000, 100000)
        company.cb_rank_delta_d7 = round(random.uniform(-10, 10), 2)
        company.cb_rank_delta_d30 = round(random.uniform(-30, 30), 2)
        company.cb_rank_delta_d90 = round(random.uniform(-60, 60), 2)
        company.cb_hub_tags = random.sample(['defense', 'ai', 'robotics', 'biotech', 'aerospace'], k=random.randint(0, 3))
        company.cb_growth_category = random.choice(['fast-growing', 'steady', 'declining'])
        company.cb_growth_confidence = random.choice(['low', 'medium', 'high'])
        company.cb_num_articles = random.randint(0, 200)
        company.cb_num_events_appearances = random.randint(0, 50)
        update_fields.extend([
            'cb_rank', 'cb_rank_delta_d7', 'cb_rank_delta_d30', 'cb_rank_delta_d90', 'cb_hub_tags',
            'cb_growth_category', 'cb_growth_confidence', 'cb_num_articles', 'cb_num_events_appearances'
        ])

        # Web metrics
        company.web_monthly_visits = random.randint(1_000, 2_000_000)
        company.web_avg_visits_m6 = int(company.web_monthly_visits * random.uniform(0.6, 1.2))
        company.web_monthly_visits_growth = round(random.uniform(-0.5, 0.8), 3)
        company.web_visit_duration = round(random.uniform(30, 300), 1)
        company.web_visit_duration_growth = round(random.uniform(-0.5, 0.8), 3)
        company.web_pages_per_visit = round(random.uniform(1.0, 8.0), 2)
        company.web_pages_per_visit_growth = round(random.uniform(-0.5, 0.8), 3)
        company.web_bounce_rate = round(random.uniform(0.2, 0.8), 3)
        company.web_bounce_rate_growth = round(random.uniform(-0.5, 0.8), 3)
        company.web_traffic_rank = random.randint(1, 2_000_000)
        company.web_monthly_traffic_rank_change = random.randint(-10_000, 10_000)
        company.web_monthly_traffic_rank_growth = round(random.uniform(-0.5, 0.8), 3)
        company.web_tech_count = random.randint(0, 80)
        update_fields.extend([
            'web_monthly_visits', 'web_avg_visits_m6', 'web_monthly_visits_growth', 'web_visit_duration',
            'web_visit_duration_growth', 'web_pages_per_visit', 'web_pages_per_visit_growth', 'web_bounce_rate',
            'web_bounce_rate_growth', 'web_traffic_rank', 'web_monthly_traffic_rank_change',
            'web_monthly_traffic_rank_growth', 'web_tech_count'
        ])

        # Apps & stack
        company.apps_count = random.randint(0, 10)
        company.apps_downloads_count_d30 = random.randint(0, 50_000)
        company.tech_stack_product_count = random.randint(0, 120)
        update_fields.extend(['apps_count', 'apps_downloads_count_d30', 'tech_stack_product_count'])

        # Diversity flags
        company.founders_count = random.randint(1, 3)
        company.has_diversity_on_founders = random.choice([True, False, None])
        company.has_women_on_founders = random.choice([True, False, None])
        company.has_black_on_founders = random.choice([True, False, None])
        company.has_hispanic_on_founders = random.choice([True, False, None])
        company.has_asian_on_founders = random.choice([True, False, None])
        company.has_meo_on_founders = random.choice([True, False, None])
        update_fields.extend([
            'founders_count', 'has_diversity_on_founders', 'has_women_on_founders', 'has_black_on_founders',
            'has_hispanic_on_founders', 'has_asian_on_founders', 'has_meo_on_founders'
        ])

        # Accelerators and CB industries/groups (purely cosmetic arrays)
        company.accelerators_names = random.sample(
            ['YC', 'Techstars', 'MassChallenge', 'Alchemist', 'Starburst'], k=random.randint(0, 2)
        )
        company.cb_industries_names = [ind.name for ind in company.industries.all()][:3]
        company.cb_industries_groups = random.sample(
            ['Artificial Intelligence', 'Defense & Space', 'Healthcare & Biotech', 'Fintech', 'Energy'],
            k=random.randint(0, 3),
        )
        update_fields.extend(['accelerators_names', 'cb_industries_names', 'cb_industries_groups'])

        if update_fields:
            update_fields.append('updated_at')
            company.save(update_fields=list(set(update_fields)))

    # ---------- Company Artifacts ----------
    def _seed_company_artifacts(self, batch: str, companies):
        # Grants across ~40% companies
        agencies = ['DoD', 'DARPA', 'NSF', 'NIH', 'AFWERX', 'Navy']
        for c in random.sample(companies, k=max(1, len(companies) * 4 // 10)):
            n = random.randint(1, 3)
            for i in range(n):
                yr = random.randint(2015, 2024)
                month = random.randint(1, 12)
                Grant.objects.get_or_create(
                    company=c,
                    sbir_id=f'{batch}-{c.id}-{i}',
                    defaults={
                        'name': f'{random.choice(agencies)} SBIR Award',
                        'granting_agency': random.choice(agencies),
                        'potential_amount': random.choice([50000, 150000, 750000, 1500000]),
                        'award_year': yr,
                        'award_month': month,
                        'description': 'SBIR/STTR style award (dummy).',
                        'extras': {'dummy': True, 'batch': batch},
                    },
                )

        # Patents across ~50%
        for c in random.sample(companies, k=max(1, len(companies) // 2)):
            n = random.randint(1, 4)
            for i in range(n):
                number = f'D-{batch}-{c.id}-{i}'
                PatentApplication.objects.get_or_create(
                    company=c,
                    number=number,
                    defaults={
                        'invention_title': f'{c.name} Invention #{i+1}',
                        'filing_date': date(random.randint(2016, 2024), random.randint(1, 12), random.randint(1, 28)),
                        'status_description': random.choice(['Pending', 'Granted', 'Abandoned']),
                        'extras': {'dummy': True, 'batch': batch},
                    },
                )

        # Clinical studies across ~20%
        for c in random.sample(companies, k=max(1, max(1, len(companies) // 5))):
            n = random.randint(1, 2)
            for i in range(n):
                ClinicalStudy.objects.get_or_create(
                    company=c,
                    nct_id=f'D{batch}{c.id}{i}',
                    defaults={
                        'title': f'{c.name} Study {i+1}',
                        'status': random.choice(list(ClinicalStudy.STATUS_CHOICES.keys())),
                        'lead_sponsor_name': c.name,
                        'start_date_str': f'{random.randint(2017, 2024)}-0{random.randint(1,9)}',
                    },
                )

    # ---------- Deals ----------
    def _seed_deals(self, batch: str, companies, user, deal_count: int, draft_count: int):
        industries = list(Industry.objects.all())
        signals = list(DualUseSignal.objects.all())
        stages = list(FundingStage.objects.all())
        types = list(FundingType.objects.all())

        deals = []

        # Non-draft deals linked to companies
        for i in range(deal_count):
            company = random.choice(companies)
            name = f"Dummy Deal #{i+1} [{batch}]"
            created_at = timezone.now() - timedelta(days=random.randint(0, 90))
            d, created = Deal.all_objects.get_or_create(
                name=name,
                company=company,
                defaults={
                    'description': f'Investment opportunity for {company.name}',
                    'website': company.website,
                    'status': random.choice(list(DealStatus.values)),
                    'funding_stage': random.choice(stages) if stages else None,
                    'funding_type': random.choice(types) if types else None,
                    'funding_target': random.choice([None, 500_000, 2_500_000, 10_000_000]),
                    'funding_raised': random.choice([0, 100_000, 1_000_000, 5_000_000]),
                    'investors_names': random.sample(
                        ['Sequoia', 'a16z', 'USAF', 'NSF', 'YC', 'Founders Fund'], k=random.randint(0, 3)
                    ),
                    'partners_names': random.sample(['Lockheed', 'Boeing', 'NASA', 'DARPA'], k=random.randint(0, 2)),
                    'customers_names': random.sample(['US Army', 'US Navy', 'USAF', 'NGA'], k=random.randint(0, 2)),
                    'govt_relationships': random.sample(['OTA', 'CRADA', 'DIB'], k=random.randint(0, 2)),
                    'has_civilian_use': random.choice([True, False, None]),
                    'creator': user,
                    'created_at': created_at,
                },
            )
            if created:
                inds = random.sample(industries, k=min(len(industries), random.randint(1, 3))) if industries else []
                if inds:
                    d.industries.add(*inds)
                sigs = (
                    random.sample(signals, k=min(len(signals), random.randint(0, 3))) if signals else []
                )
                if sigs:
                    d.dual_use_signals.add(*sigs)
            deals.append(d)

        # Draft deals (no company required)
        for i in range(draft_count):
            name = f"Dummy Draft #{i+1} [{batch}]"
            DraftDeal.objects.get_or_create(
                name=name,
                defaults={'description': 'Drafted opportunity', 'creator': user, 'is_draft': True},
            )

        return deals

    # ---------- Deal Assessments ----------
    def _seed_deal_assessments(self, batch: str, deals):
        if not deals:
            return
        sample_deals = random.sample(deals, k=max(1, len(deals) // 3))
        for d in sample_deals:
            DealAssessment.objects.get_or_create(
                deal=d,
                defaults={
                    'tags': [f'dummy:{batch}', 'initial-review'],
                    'pros': 'Strong traction, unique tech',
                    'cons': 'Regulatory risk',
                    'recommendation': random.choice(list(DealFollowUp.values)),
                    'investment_rationale': 'Strategic dual-use value',
                    'problem': 'Operational inefficiency in target sector',
                    'solution': 'AI-driven autonomy stack',
                    'thesis_fit': 'Aligned with defense tech thesis',
                    'quality_percentile': random.choice(list(DealQualityPercentile.values)),
                    'numeric_score': round(random.uniform(5.0, 9.5), 1),
                    'non_numeric_score': random.choice(list(DealNonNumericScore.values)),
                    'confidence': random.choice(list(DealAssessmentConfidence.values)),
                },
            )

    # ---------- Missed Deals ----------
    def _seed_missed_deals(self, batch: str, companies, user):
        if not companies:
            return
        subset = random.sample(companies, k=max(1, len(companies) // 5))
        for idx, c in enumerate(subset):
            last_date = date(random.randint(2019, 2024), random.randint(1, 12), random.randint(1, 28))
            MissedDeal.objects.get_or_create(
                company=c,
                name=f"Missed: {c.name} [{batch}]",
                defaults={
                    'summary': 'Recorded as missed deal (dummy)',
                    'description': 'Captured for dashboard parity testing',
                    'website': c.website,
                    'hq_country': 'US',
                    'hq_state_name': c.hq_state_name,
                    'hq_city_name': c.hq_city_name,
                    'funding_stage': random.choice(list(FundingStage.objects.all())) if FundingStage.objects.exists() else None,
                    'last_funding_date': last_date,
                    'creator': user,
                },
            )

    # ---------- Library ----------
    def _seed_library(self, batch: str, deals, with_files: bool):
        # Authors
        authors = []
        for i in range(8):
            a, _ = PaperAuthor.objects.get_or_create(name=f'Author {i+1} [{batch}]')
            authors.append(a)

        # Papers (general)
        doc_types = list(DocumentType.objects.all())
        for i in range(10):
            title = f'Dummy Paper {i+1} [{batch}]'
            p, created = LibraryPaper.objects.get_or_create(
                title=title,
                defaults={
                    'abstract': 'Abstract for testing',
                    'tldr': 'Short summary',
                    'publication_year': random.randint(2018, 2024),
                },
            )
            if created:
                if doc_types:
                    p.document_types.add(random.choice(doc_types))
                p.authors.add(*random.sample(authors, k=random.randint(1, min(3, len(authors)))))

        # Deals papers (attached to deals)
        if deals:
            for d in random.sample(deals, k=min(5, len(deals))):
                title = f'{d.display_name} Tech Note [{batch}]'
                p, created = LibraryPaper.objects.get_or_create(
                    title=title,
                    defaults={'abstract': f'Notes for {d.display_name}', 'publication_year': timezone.now().year},
                )
                if created:
                    # Attach via polymorphic base fields
                    p.categories.set([])
                    p.source = LibrarySource.objects.first()
                    p.save()

        # Deals decks (metadata only, no files)
        if deals:
            for d in random.sample(deals, k=min(8, len(deals))):
                Deck.objects.get_or_create(
                    deal=d,
                    title=f'{d.display_name} Pitch Deck [{batch}]',
                    defaults={'subtitle': 'Overview', 'text': 'Executive summary and key metrics', 'mime_type': 'application/pdf'},
                )

        # Optional: plain library files (no uploads, no src)
        if with_files:
            src = LibrarySource.objects.first()
            cat_list = list(LibraryCategory.objects.all())
            for i in range(8):
                f, _ = LibraryFile.objects.get_or_create(
                    src_id=f'dummy-{batch}-{i}',
                    defaults={
                        'source': src,
                        'mime_type': 'application/pdf',
                        'tags': [f'dummy:{batch}'],
                    },
                )
                if cat_list:
                    f.categories.add(random.choice(cat_list))
