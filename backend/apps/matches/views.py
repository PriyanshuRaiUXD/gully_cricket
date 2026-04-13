from itertools import combinations

from rest_framework import generics, status, views
from rest_framework.response import Response

from apps.tournament.models import Tournament

from .models import Innings, Match
from .serializers import MatchSerializer, TossSerializer


class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        return Match.objects.filter(
            tournament_id=self.kwargs["tournament_id"],
            tournament__created_by=self.request.user,
        ).select_related("team1", "team2", "pool", "winner")


class MatchDetailView(generics.RetrieveAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        return Match.objects.filter(
            tournament__created_by=self.request.user
        ).select_related("team1", "team2", "pool", "winner")


class GenerateFixturesView(views.APIView):
    """Auto-generate round-robin fixtures for all pools."""

    def post(self, request, tournament_id):
        tournament = Tournament.objects.get(
            id=tournament_id, created_by=request.user, is_deleted=False
        )
        if tournament.status != Tournament.Status.SETUP:
            return Response(
                {"error": "Fixtures can only be generated during setup."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Ensure all teams are assigned to pools
        unassigned = tournament.teams.filter(pool__isnull=True).count()
        if unassigned > 0:
            return Response(
                {"error": f"{unassigned} team(s) not assigned to a pool."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match_number = 1
        created = []
        for pool in tournament.pools.all():
            teams = list(pool.teams.all())
            for team1, team2 in combinations(teams, 2):
                match = Match.objects.create(
                    tournament=tournament,
                    team1=team1,
                    team2=team2,
                    pool=pool,
                    stage=Match.Stage.POOL,
                    match_number=match_number,
                )
                created.append(match.id)
                match_number += 1

        # Transition tournament to pool stage
        tournament.status = Tournament.Status.POOL_STAGE
        tournament.save(update_fields=["status"])

        return Response(
            {"detail": f"Generated {len(created)} matches.", "match_ids": created},
            status=status.HTTP_201_CREATED,
        )


class TossView(views.APIView):
    """Record toss result for a match."""

    def post(self, request, pk):
        match = Match.objects.get(
            id=pk, tournament__created_by=request.user
        )
        if match.status not in (Match.Status.SCHEDULED, Match.Status.TOSS):
            return Response(
                {"error": "Toss can only be done for scheduled matches."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TossSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        toss_winner_id = serializer.validated_data["toss_winner_id"]
        decision = serializer.validated_data["decision"]

        if str(toss_winner_id) not in (str(match.team1_id), str(match.team2_id)):
            return Response(
                {"error": "Toss winner must be one of the two teams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match.toss_winner_id = toss_winner_id
        match.toss_decision = decision
        match.status = Match.Status.TOSS

        # Determine batting/bowling for innings 1
        if decision == Match.TossDecision.BAT:
            batting_team_id = toss_winner_id
            bowling_team_id = (
                match.team2_id if str(toss_winner_id) == str(match.team1_id) else match.team1_id
            )
        else:
            bowling_team_id = toss_winner_id
            batting_team_id = (
                match.team2_id if str(toss_winner_id) == str(match.team1_id) else match.team1_id
            )

        match.save(update_fields=["toss_winner", "toss_decision", "status"])

        # Create both innings
        Innings.objects.create(
            match=match, innings_number=1,
            batting_team_id=batting_team_id, bowling_team_id=bowling_team_id,
        )
        Innings.objects.create(
            match=match, innings_number=2,
            batting_team_id=bowling_team_id, bowling_team_id=batting_team_id,
        )

        return Response(MatchSerializer(match).data)


class ForfeitView(views.APIView):
    """Forfeit a match."""

    def post(self, request, pk):
        match = Match.objects.get(id=pk, tournament__created_by=request.user)
        forfeiting_team_id = request.data.get("forfeiting_team_id")

        if str(forfeiting_team_id) not in (str(match.team1_id), str(match.team2_id)):
            return Response(
                {"error": "Forfeiting team must be one of the two teams."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match.status = Match.Status.FORFEITED
        match.winner_id = (
            match.team2_id if str(forfeiting_team_id) == str(match.team1_id) else match.team1_id
        )
        match.result_summary = f"{match.winner.name} won by forfeit"
        match.save(update_fields=["status", "winner", "result_summary"])

        return Response(MatchSerializer(match).data)
