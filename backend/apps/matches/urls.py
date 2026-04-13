from django.urls import path

from . import views

urlpatterns = [
    path(
        "tournaments/<uuid:tournament_id>/matches/",
        views.MatchListView.as_view(),
        name="match-list",
    ),
    path(
        "tournaments/<uuid:tournament_id>/matches/generate/",
        views.GenerateFixturesView.as_view(),
        name="match-generate",
    ),
    path("matches/<uuid:pk>/", views.MatchDetailView.as_view(), name="match-detail"),
    path("matches/<uuid:pk>/toss/", views.TossView.as_view(), name="match-toss"),
    path("matches/<uuid:pk>/forfeit/", views.ForfeitView.as_view(), name="match-forfeit"),
]
