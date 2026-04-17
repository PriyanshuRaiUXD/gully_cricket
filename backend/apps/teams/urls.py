from django.urls import path

from . import views

urlpatterns = [
    path(
        "tournaments/<uuid:tournament_id>/teams/",
        views.TeamListCreateView.as_view(),
        name="team-list-create",
    ),
    path(
        "tournaments/<uuid:tournament_id>/teams/public-register/",
        views.PublicTeamRegistrationView.as_view(),
        name="public-team-register",
    ),
    path("teams/<uuid:pk>/", views.TeamDetailView.as_view(), name="team-detail"),
    path(
        "teams/<uuid:team_id>/players/",
        views.PlayerListCreateView.as_view(),
        name="player-list-create",
    ),
    path("players/<uuid:pk>/", views.PlayerDetailView.as_view(), name="player-detail"),
]
