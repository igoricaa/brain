from __future__ import annotations

from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.db.models import Count


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


"""
Note: A former JSON view `summary_data` lived here. It has been replaced by the
DRF endpoint `/api/dual-use/summary/` (see `dual_use.api.views`).
"""
