from __future__ import annotations

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render


def du_dashboard(request: HttpRequest) -> HttpResponse:
    return render(request, "dual_use/dashboard.html", {})


def report_list(request: HttpRequest) -> HttpResponse:
    return render(request, "dual_use/report_list.html", {})


def unreviewed_report_list(request: HttpRequest) -> HttpResponse:
    return render(request, "dual_use/unreviewed_report_list.html", {})


def report_detail(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "dual_use/report_detail.html", {"uuid": uuid})


def report_create(request: HttpRequest) -> HttpResponse:
    return render(request, "dual_use/report_create.html", {})


def report_update(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "dual_use/report_update.html", {"uuid": uuid})


def report_delete(request: HttpRequest, uuid) -> HttpResponse:
    return render(request, "dual_use/report_delete.html", {"uuid": uuid})


def summary_data(request: HttpRequest) -> JsonResponse:
    """Placeholder summary data endpoint for the DU dashboard.

    Will be implemented in T-0403; for now return an empty payload so the route responds.
    """
    return JsonResponse({"ok": True, "data": {}})

