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
    path(
        "tournaments/<uuid:tournament_id>/matches/generate-knockouts/",
        views.GenerateKnockoutsView.as_view(),
        name="match-generate-knockouts",
    ),
    path("matches/<uuid:pk>/", views.MatchDetailView.as_view(), name="match-detail"),
    path("matches/<uuid:pk>/toss/", views.TossView.as_view(), name="match-toss"),
    path("matches/<uuid:pk>/forfeit/", views.ForfeitView.as_view(), name="match-forfeit"),
    path("matches/<uuid:pk>/super-over/start/", views.SuperOverStartView.as_view(), name="super-over-start"),
    path("matches/<uuid:pk>/super-over/ball/", views.SuperOverBallView.as_view(), name="super-over-ball"),
    path("matches/<uuid:pk>/mom/", views.MOMRecommendationView.as_view(), name="mom-recommendation"),
    path("matches/<uuid:pk>/mom/override/", views.MOMOverrideView.as_view(), name="mom-override"),
]
