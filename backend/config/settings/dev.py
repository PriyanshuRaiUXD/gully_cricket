"""Development settings."""

from .base import *  # noqa: F401,F403

DEBUG = True

# Optional dev tools — install with: pip install -r requirements/dev.txt
try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS += ["debug_toolbar", "django_extensions"]  # noqa: F405
    MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
except ImportError:
    pass

INTERNAL_IPS = ["127.0.0.1"]

# WhiteNoise compressed storage needs collectstatic; use simple storage in dev
STORAGES = {  # noqa: F405
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Use SQLite in dev
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}
