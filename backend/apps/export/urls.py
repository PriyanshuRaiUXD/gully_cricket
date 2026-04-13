from django.urls import path

from . import views

urlpatterns = [
    path(
        "tournaments/<uuid:tournament_id>/export/",
        views.ExportTournamentView.as_view(),
        name="tournament-export",
    ),
]
