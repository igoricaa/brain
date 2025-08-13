from __future__ import annotations

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate

from .models import Deal
from .models import DealAssessment
from common.models import ProcessingStatus


def deals_dashboard(request: HttpRequest) -> HttpResponse:
    return render(request, "deals/deals_dashboard.html", {})


def fresh_deals(request: HttpRequest) -> HttpResponse:
    return render(request, "deals/fresh_deals.html", {})


def reviewed_deals(request: HttpRequest) -> HttpResponse:
    return render(request, "deals/reviewed_deals.html", {})


def deals_list(request: HttpRequest) -> HttpResponse:
    """Render the unified deals list page with comprehensive table view."""
    return render(request, "deals/deals_list.html", {})


def missed_deals(request: HttpRequest) -> HttpResponse:
    return render(request, "deals/missed_deal_list.html", {})


def deal_detail(request: HttpRequest, uuid) -> HttpResponse:
    deal = get_object_or_404(Deal.objects.select_related("company", "funding_stage"), uuid=uuid)
    context = {
        "deal": deal,
        "company": deal.company,
    }
    return render(request, "deals/deal_detail.html", context)


def deal_update(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "deals/deal_update.html", {"uuid": uuid})


def deal_assessment(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "deals/deal_assessment.html", {"uuid": uuid})


def deal_confirm_delete(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "deals/deal_confirm_delete.html", {"uuid": uuid})


def deck_create(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "deals/deck_create.html", {"uuid": uuid})


def deal_upload(request: HttpRequest) -> HttpResponse:
    """Render the Upload New Deal page (React island).

    This page allows uploading a PDF deck to create a new Deal and redirect
    to the created deal's detail page. The React app posts to /api/deals/decks/.
    """
    return render(request, "deals/deal_upload.html", {})


def deal_refresh(request: HttpRequest, uuid) -> JsonResponse:
    """Trigger a refresh for a deal's derived data.

    For now, this sets the deal's processing_status to STARTED and, if there are no
    pending files to process, marks it SUCCESS immediately. Background processing is
    out of scope here; the frontend will poll processing-status until ready.
    """
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Method not allowed"}, status=405)

    deal = get_object_or_404(Deal.all_objects.select_related("company"), uuid=uuid)

    # Kick off processing
    deal.processing_status = ProcessingStatus.STARTED
    deal.save(update_fields=["processing_status", "updated_at"])

    # If files are already ready, immediately flip to SUCCESS to avoid unnecessary polling
    has_pending_files = deal.files.filter(
        processing_status__in=[
            ProcessingStatus.PENDING,
            ProcessingStatus.STARTED,
            ProcessingStatus.RETRY,
        ]
    ).exists()

    if not has_pending_files:
        deal.processing_status = ProcessingStatus.SUCCESS
        deal.save(update_fields=["processing_status", "updated_at"])

    return JsonResponse({"ok": True, "uuid": str(deal.uuid), "status": deal.processing_status})


def deal_processing_status(request: HttpRequest, uuid) -> JsonResponse:
    """Return readiness of a deal for UI refresh.

    A deal is ready when its own processing_status is not in a pending state
    and none of its files are in a pending state.
    """
    deal = get_object_or_404(Deal.all_objects, uuid=uuid)

    pending_statuses = {ProcessingStatus.PENDING, ProcessingStatus.STARTED, ProcessingStatus.RETRY}

    deal_pending = deal.processing_status in pending_statuses
    pending_files_count = deal.files.filter(processing_status__in=list(pending_statuses)).count()

    ready = (not deal_pending) and pending_files_count == 0

    return JsonResponse(
        {
            "uuid": str(deal.uuid),
            "ready": bool(ready),
            "deal_status": deal.processing_status or "",
            "pending_files": int(pending_files_count),
        }
    )


def _parse_date(s: str | None):
    if not s:
        return None
    try:
        return timezone.datetime.fromisoformat(s).date()
    except Exception:
        return None


def deals_dashboard_data(request: HttpRequest) -> JsonResponse:
    # Date range (inclusive) for trend; defaults to last 30 days
    today = timezone.localdate()
    default_start = today - timezone.timedelta(days=29)
    date_from = _parse_date(request.GET.get("date_from")) or default_start
    date_to = _parse_date(request.GET.get("date_to")) or today

    # Base queryset: non-draft deals
    deals_qs = Deal.objects.all()

    # Trend: deals created per day in range
    trend_qs = (
        deals_qs.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)
        .annotate(d=TruncDate("created_at"))
        .values("d")
        .annotate(count=Count("id"))
        .order_by("d")
    )
    # Ensure all dates in range are present (fill zeros)
    trend_map = {row["d"]: row["count"] for row in trend_qs}
    date_count_trend = []
    cur = date_from
    while cur <= date_to:
        date_count_trend.append({"date": cur.isoformat(), "count": int(trend_map.get(cur, 0))})
        cur += timezone.timedelta(days=1)

    # Funding stage distribution
    funding_stage_rows = (
        deals_qs.values("funding_stage__name")
        .annotate(count=Count("id"))
        .order_by("-count", "funding_stage__name")
    )
    funding_stage_count = [
        {"name": row["funding_stage__name"] or "Unknown", "count": int(row["count"])}
        for row in funding_stage_rows
    ]

    # Industry distribution (M2M)
    industry_rows = (
        deals_qs.values("industries__name")
        .annotate(count=Count("id"))
        .order_by("-count", "industries__name")
    )
    industry_count = [
        {"name": row["industries__name"] or "Unspecified", "count": int(row["count"])}
        for row in industry_rows
        if row["industries__name"] is not None
    ]

    # Dual-use signal distribution by category
    du_rows = (
        deals_qs.values("dual_use_signals__category__name")
        .annotate(count=Count("id"))
        .order_by("-count", "dual_use_signals__category__name")
    )
    du_signal_count = [
        {"name": row["dual_use_signals__category__name"] or "Uncategorized", "count": int(row["count"])}
        for row in du_rows
    ]

    # Time-based counts
    now = timezone.now()
    start_of_today = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
    start_of_yesterday = start_of_today - timezone.timedelta(days=1)
    start_of_week = start_of_today - timezone.timedelta(days=today.weekday())
    start_of_prev_week = start_of_week - timezone.timedelta(days=7)
    end_of_prev_week = start_of_week - timezone.timedelta(seconds=1)
    start_of_month = timezone.make_aware(
        timezone.datetime(today.year, today.month, 1)
    )
    # Previous month start/end
    prev_month_year = today.year if today.month > 1 else today.year - 1
    prev_month = today.month - 1 if today.month > 1 else 12
    start_of_prev_month = timezone.make_aware(timezone.datetime(prev_month_year, prev_month, 1))
    # Compute end of prev month as start_of_month - 1 second
    end_of_prev_month = start_of_month - timezone.timedelta(seconds=1)
    start_of_year = timezone.make_aware(timezone.datetime(today.year, 1, 1))

    def count_between(start_dt, end_dt):
        return deals_qs.filter(created_at__gte=start_dt, created_at__lte=end_dt).count()

    today_count = count_between(start_of_today, now)
    yesterday_count = count_between(start_of_yesterday, start_of_today - timezone.timedelta(seconds=1))
    current_week_count = count_between(start_of_week, now)
    previous_week_count = count_between(start_of_prev_week, end_of_prev_week)
    current_month_count = count_between(start_of_month, now)
    previous_month_count = count_between(start_of_prev_month, end_of_prev_month)
    total_count = deals_qs.count()
    current_year_count = count_between(start_of_year, now)

    # Deals whose companies have grants / clinical studies
    # Use related_query_name for reverse lookups: 'grant' and 'clinical_study'
    deals_with_grant_count = deals_qs.filter(company__grant__isnull=False).distinct().count()
    deals_with_clinical_study_count = deals_qs.filter(company__clinical_study__isnull=False).distinct().count()

    # Quality percentile distribution (based on assessments)
    qp_rows = (
        DealAssessment.objects.values("quality_percentile")
        .annotate(count=Count("id"))
        .order_by("quality_percentile")
    )
    quality_percentile_count = [
        {"key": row["quality_percentile"] or "", "count": int(row["count"])} for row in qp_rows
    ]

    # Sent-to-Affinity trend over the date range
    sent_rows = (
        deals_qs.filter(sent_to_affinity=True, created_at__date__gte=date_from, created_at__date__lte=date_to)
        .annotate(d=TruncDate("created_at"))
        .values("d")
        .annotate(count=Count("id"))
        .order_by("d")
    )
    sent_map = {row["d"]: row["count"] for row in sent_rows}
    sent_to_affinity_count = []
    cur = date_from
    while cur <= date_to:
        sent_to_affinity_count.append({"date": cur.isoformat(), "count": int(sent_map.get(cur, 0))})
        cur += timezone.timedelta(days=1)

    data = {
        "date_count_trend": date_count_trend,
        "funding_stage_count": funding_stage_count,
        "industry_count": industry_count,
        "du_signal_count": du_signal_count,
        "today_count": int(today_count),
        "yesterday_count": int(yesterday_count),
        "current_week_count": int(current_week_count),
        "previous_week_count": int(previous_week_count),
        "current_month_count": int(current_month_count),
        "previous_month_count": int(previous_month_count),
        "total_count": int(total_count),
        "current_year_count": int(current_year_count),
        "deals_with_grant_count": int(deals_with_grant_count),
        "deals_with_clinical_study_count": int(deals_with_clinical_study_count),
        "quality_percentile_count": quality_percentile_count,
        "sent_to_affinity_count": sent_to_affinity_count,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
    return JsonResponse(data)
