from rest_framework import status, views
from rest_framework.response import Response

from apps.matches.models import Innings, Match
from apps.matches.serializers import InningsSerializer

from .engine import record_ball, undo_last_ball
from .models import Ball
from .serializers import BallInputSerializer, BallSerializer


class RecordBallView(views.APIView):
    """Record a ball-by-ball event during a match."""

    def post(self, request, match_id):
        match = Match.objects.get(id=match_id, tournament__created_by=request.user)

        if match.status not in (Match.Status.IN_PROGRESS, Match.Status.TOSS):
            return Response(
                {"error": "Match is not in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get active innings
        active_innings = match.innings.filter(is_completed=False).first()
        if not active_innings:
            return Response(
                {"error": "No active innings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BallInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Start match if still at TOSS
        if match.status == Match.Status.TOSS:
            match.status = Match.Status.IN_PROGRESS
            match.save(update_fields=["status"])

        ball, state = record_ball(active_innings, serializer.validated_data)

        return Response({
            "ball": BallSerializer(ball).data,
            "innings": InningsSerializer(active_innings).data,
            "state": state,
        }, status=status.HTTP_201_CREATED)


class UndoBallView(views.APIView):
    """Undo the last ball recorded in the active innings."""

    def post(self, request, match_id):
        match = Match.objects.get(id=match_id, tournament__created_by=request.user)
        active_innings = match.innings.filter(is_completed=False).first()

        if not active_innings:
            # Try the last completed innings (in case we need to revert completion)
            active_innings = match.innings.order_by("-innings_number").first()

        if not active_innings:
            return Response(
                {"error": "No innings found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = undo_last_ball(active_innings)
        if not result:
            return Response(
                {"error": "No balls to undo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If match was completed or at innings break, revert status
        if match.status in (Match.Status.COMPLETED, Match.Status.INNINGS_BREAK):
            match.status = Match.Status.IN_PROGRESS
            match.winner = None
            match.result_summary = ""
            match.save(update_fields=["status", "winner", "result_summary"])

        return Response({
            "undone_ball": result,
            "innings": InningsSerializer(active_innings).data,
        })


class StartInningsView(views.APIView):
    """Manually start the 2nd innings (after innings break)."""

    def post(self, request, match_id):
        match = Match.objects.get(id=match_id, tournament__created_by=request.user)

        if match.status != Match.Status.INNINGS_BREAK:
            return Response(
                {"error": "Match is not at innings break."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match.status = Match.Status.IN_PROGRESS
        match.save(update_fields=["status"])

        second_innings = match.innings.get(innings_number=2)
        first_innings = match.innings.get(innings_number=1)

        return Response({
            "innings": InningsSerializer(second_innings).data,
            "target": first_innings.total_runs + 1,
        })


class ScorecardView(views.APIView):
    """Full scorecard for a match."""

    def get(self, request, match_id):
        match = Match.objects.get(id=match_id, tournament__created_by=request.user)
        innings_list = []

        for inn in match.innings.all():
            balls = Ball.objects.filter(innings=inn).select_related(
                "striker", "non_striker", "bowler", "fielder", "dismissed_player"
            )
            innings_list.append({
                "innings": InningsSerializer(inn).data,
                "balls": BallSerializer(balls, many=True).data,
            })

        from apps.matches.serializers import MatchSerializer
        return Response({
            "match": MatchSerializer(match).data,
            "innings": innings_list,
        })
