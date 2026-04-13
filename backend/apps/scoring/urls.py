from django.urls import path

from . import views

urlpatterns = [
    path(
        "matches/<uuid:match_id>/ball/",
        views.RecordBallView.as_view(),
        name="record-ball",
    ),
    path(
        "matches/<uuid:match_id>/undo-ball/",
        views.UndoBallView.as_view(),
        name="undo-ball",
    ),
    path(
        "matches/<uuid:match_id>/start-innings/",
        views.StartInningsView.as_view(),
        name="start-innings",
    ),
    path(
        "matches/<uuid:match_id>/scorecard/",
        views.ScorecardView.as_view(),
        name="scorecard",
    ),
]
