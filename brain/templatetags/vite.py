from __future__ import annotations

import json
import os
from typing import List

from django import template
from django.conf import settings


register = template.Library()


def _vite_dev_server_url() -> str:
    # Default Vite dev server
    return os.environ.get("VITE_DEV_SERVER", "http://localhost:5173")


def _manifest_path() -> str:
    # OutDir is brain/assets/dist, served directly by Django staticfiles under /static/
    base_dir = os.path.dirname(os.path.dirname(__file__))  # brain/
    return os.path.join(base_dir, "assets", "dist", "manifest.json")


def _load_manifest() -> dict | None:
    try:
        with open(_manifest_path(), "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def _tags_for_entry_dev(entry: str) -> str:
    # In dev, Vite serves from /@vite/client and the raw source path
    dev = _vite_dev_server_url().rstrip("/")
    entry_src = entry if entry.startswith("/") else f"/{entry}"
    return "\n".join([
        f'<script type="module" src="{dev}/@vite/client"></script>',
        f'<script type="module" src="{dev}{entry_src}"></script>',
    ])


def _tags_for_entry_prod(entry: str) -> str:
    manifest = _load_manifest() or {}
    # Vite manifest keys are usually like 'src/main.tsx'
    key = entry
    if key not in manifest:
        # try with a 'src/' prefix if not provided
        key = f"src/{entry.lstrip('/') }"
    info = manifest.get(key)
    if not info:
        # Fail soft: no tags
        return ""

    static_url = settings.STATIC_URL.rstrip("/")
    tags: List[str] = []

    # CSS first (if present)
    for css in info.get("css", []):
        tags.append(f'<link rel="stylesheet" href="{static_url}/{css}">')

    # Then the main JS file
    file_path = info.get("file")
    if file_path:
        tags.append(f'<script type="module" src="{static_url}/{file_path}"></script>')

    # And any imported CSS from nested chunks
    for imp in info.get("imports", []):
        imp_info = manifest.get(imp)
        if not imp_info:
            continue
        for css in imp_info.get("css", []):
            tags.append(f'<link rel="stylesheet" href="{static_url}/{css}">')

    return "\n".join(tags)


@register.simple_tag
def vite_entry(entry: str = "src/main.tsx") -> str:
    """Render tags for a Vite entry.

    Usage:
        {% load vite %}
        {% vite_entry 'src/main.tsx' %}
    """
    if getattr(settings, "DEBUG", False):
        return _tags_for_entry_dev(entry)
    return _tags_for_entry_prod(entry)

