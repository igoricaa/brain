from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets

from companies.models import Company
from deals.models import Deal


@extend_schema_view(
    summary=extend_schema(
        summary='Dual-use Summary',
        description='Aggregated counts for the Dual-use dashboard.',
    )
)
class DualUseSummaryViewSet(viewsets.ViewSet):
    """Provides aggregated counts for the Dual-use dashboard.

    Endpoint: /api/dual-use/summary/
    Optional query params:
      - category_name (iexact match on DualUseCategory.name)
      - hq_country (ISO alpha-2 code for Company.hq_country)
    """

    # OAuth2 scope required for access (for DOT TokenHasScope)
    required_scopes = ['default']

    @extend_schema(
        parameters=[
            OpenApiParameter(name='category_name', description='Dual-use category name (iexact)', required=False, type=str),
            OpenApiParameter(name='hq_country', description='Company HQ country (ISO alpha-2)', required=False, type=str),
        ]
    )
    @action(detail=False, methods=['get'], url_path='summary', url_name='summary')
    def summary(self, request):
        category_name = (request.GET.get('category_name') or '').strip()
        hq_country = (request.GET.get('hq_country') or '').strip()

        # Base: deals with any DU signal
        deals_qs = Deal.objects.filter(dual_use_signals__isnull=False)
        if category_name:
            deals_qs = deals_qs.filter(dual_use_signals__category__name__iexact=category_name)

        # Companies linked to those deals
        companies = Company.objects.filter(deal__in=deals_qs).distinct()
        if hq_country:
            companies = companies.filter(hq_country=hq_country)

        def aggregate(values_field: str):
            rows = (
                companies.values(values_field)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count', values_field)
            )
            result = []
            for row in rows:
                name = row.get(values_field)
                if name is None or name == '':
                    name = 'Unknown'
                result.append({'name': name, 'count': int(row['count'])})
            return result

        tech_type_company_count = aggregate('technology_type__name')
        # Industries (M2M)
        industry_rows = (
            companies.values('industries__name')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count', 'industries__name')
        )
        industries_company_count = [
            {'name': (row['industries__name'] or 'Unspecified'), 'count': int(row['count'])}
            for row in industry_rows
            if row['industries__name'] is not None
        ]

        data = {
            'hq_country_company_count': aggregate('hq_country'),
            'hq_state_company_count': aggregate('hq_state_name'),
            'hq_city_company_count': aggregate('hq_city_name'),
            'tech_type_company_count': tech_type_company_count,
            'industries_company_count': industries_company_count,
            'year_founded_company_count': aggregate('year_founded'),
            'founders_count_company_count': aggregate('founders_count'),
        }

        return Response(data)
