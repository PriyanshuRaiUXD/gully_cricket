from django.urls import path

from . import views

urlpatterns = [
    path("", views.TournamentListCreateView.as_view(), name="tournament-list-create"),
    path("<uuid:pk>/", views.TournamentDetailView.as_view(), name="tournament-detail"),
    path("<uuid:tournament_id>/pools/", views.PoolListView.as_view(), name="pool-list"),
    path(
        "<uuid:tournament_id>/pools/randomize/",
        views.PoolRandomizeView.as_view(),
        name="pool-randomize",
    ),
    path(
        "<uuid:tournament_id>/standings/",
        views.StandingsView.as_view(),
        name="standings",
    ),
    path(
        "<uuid:tournament_id>/mot/",
        views.MOTCalculationView.as_view(),
        name="mot",
    ),
]
