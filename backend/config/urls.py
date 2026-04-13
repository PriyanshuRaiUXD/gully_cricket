"""URL configuration for Gully Cricket backend."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API routes
    path("api/auth/", include("apps.users.urls")),
    path("api/tournaments/", include("apps.tournament.urls")),
    path("api/", include("apps.teams.urls")),
    path("api/", include("apps.matches.urls")),
    path("api/", include("apps.scoring.urls")),
    path("api/", include("apps.export.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    except ImportError:
        pass
