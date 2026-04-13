"""Production settings — Docker / cloud instance."""

import dj_database_url

from .base import *  # noqa: F401,F403

DEBUG = False

# Database — PostgreSQL via DATABASE_URL env var
DATABASES = {
    "default": dj_database_url.config(
        default="postgres://postgres:postgres@db:5432/gullycricket",
        conn_max_age=600,
    )
}

# Security hardening
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
