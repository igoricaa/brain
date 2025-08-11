import os
from pathlib import Path

from .celery import app as celery_app

__all__ = ['celery_app']

BASE_DIR = Path(__file__).resolve().parent.parent

os.environ.setdefault('AINDEX_CONFIG_DIR', str(BASE_DIR))
os.environ.setdefault('AINDEX_ENV_FILE', str(BASE_DIR / '.env'))
