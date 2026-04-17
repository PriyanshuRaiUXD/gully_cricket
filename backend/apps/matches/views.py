from itertools import combinations

from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.tournament.models import Tournament

from .models import Innings, Match
from .serializers import MatchSerializer, TossSerializer


class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Match.objects.filter(
            tournament_id=self.kwargs["tournament_id"],
        ).select_related("team1", "team2", "pool", "winner").prefetch_related("innings")


class MatchDetailView(generics.RetrieveAPIView):
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Match.objects.all().select_related("team1", "team2", "pool", "winner").prefetch_related("innings")


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


class GenerateKnockoutsView(views.APIView):
    """Transition to knockouts and generate semi-finals based on standings."""

    def post(self, request, tournament_id):
        tournament = Tournament.objects.get(
            id=tournament_id, created_by=request.user, is_deleted=False
        )
        if tournament.status != Tournament.Status.POOL_STAGE:
            return Response(
                {"error": "Can only generate knockouts from pool stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure all pool matches are completed
        uncompleted = Match.objects.filter(
            tournament=tournament,
            stage=Match.Stage.POOL
        ).exclude(
            status__in=[Match.Status.COMPLETED, Match.Status.FORFEITED, Match.Status.ABANDONED]
        ).count()

        if uncompleted > 0:
            return Response(
                {"error": f"{uncompleted} pool match(es) still uncompleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.tournament.views import StandingsView
        standings_data = StandingsView().get(request, tournament_id).data

        # Find semi-final matchups
        matchups = []
        pools = sorted(standings_data, key=lambda p: p["pool"]["name"])
        pool_count = len(pools)

        if pool_count == 1:
            teams = pools[0]["standings"]
            if len(teams) < 4:
                return Response({"error": "Need at least 4 teams for knockouts."}, status=400)
            matchups.append((teams[0]["id"], teams[3]["id"]))
            matchups.append((teams[1]["id"], teams[2]["id"]))
        elif pool_count == 2:
            t1 = pools[0]["standings"]
            t2 = pools[1]["standings"]
            if len(t1) < 2 or len(t2) < 2:
                return Response({"error": "Need at least 2 teams per pool for knockouts."}, status=400)
            matchups.append((t1[0]["id"], t2[1]["id"]))
            matchups.append((t2[0]["id"], t1[1]["id"]))
        elif pool_count == 4:
            t1, t2, t3, t4 = [p["standings"] for p in pools]
            if len(t1) < 1 or len(t2) < 1 or len(t3) < 1 or len(t4) < 1:
                return Response({"error": "Need at least 1 team per pool for knockouts."}, status=400)
            matchups.append((t1[0]["id"], t2[0]["id"]))
            matchups.append((t3[0]["id"], t4[0]["id"]))
        else:
            return Response({"error": "Unsupported pool count for knockouts."}, status=400)

        # Get max match number
        last_match = Match.objects.filter(tournament=tournament).order_by("-match_number").first()
        match_num = getattr(last_match, "match_number", 0)

        from apps.teams.models import Team
        created = []
        for t1_id, t2_id in matchups:
            match_num += 1
            m = Match.objects.create(
                tournament=tournament,
                team1=Team.objects.get(id=t1_id),
                team2=Team.objects.get(id=t2_id),
                stage=Match.Stage.SEMI_FINAL,
                match_number=match_num,
            )
            created.append(m.id)

        tournament.status = Tournament.Status.KNOCKOUTS
        tournament.save(update_fields=["status"])

        return Response({
            "detail": f"Generated {len(created)} semi-final matches.",
            "match_ids": created
        }, status=status.HTTP_201_CREATED)


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

        match.refresh_from_db()
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


class SuperOverStartView(views.APIView):
    """Start a super over for a tied knockout match."""

    def post(self, request, pk):
        match = Match.objects.get(id=pk, tournament__created_by=request.user)
        
        if match.stage == Match.Stage.POOL:
            return Response({"error": "Super Over is only for knockout matches."}, status=400)
            
        from .models import SuperOver
        so_round = match.super_overs.count() + 1
        so = SuperOver.objects.create(match=match, round=so_round)
        
        match.status = Match.Status.IN_PROGRESS
        match.winner = None
        match.save(update_fields=["status", "winner"])
        
        return Response({"id": so.id, "round": so.round, "message": f"Started Super Over {so.round}"}, status=201)


class SuperOverBallView(views.APIView):
    """Record runs in a super over."""

    def post(self, request, pk):
        match = Match.objects.get(id=pk, tournament__created_by=request.user)
        from .models import SuperOver
        so = match.super_overs.last()
        
        if not so:
            return Response({"error": "No active super over."}, status=400)
            
        team_id = request.data.get("team_id")
        runs = request.data.get("runs", 0)
        
        if str(team_id) == str(match.team1_id):
            so.team1_runs += int(runs)
        elif str(team_id) == str(match.team2_id):
            so.team2_runs += int(runs)
        else:
            return Response({"error": "Invalid team ID."}, status=400)
            
        so.save(update_fields=["team1_runs", "team2_runs"])
        
        # Check if match should end based on super over completion
        end_match = request.data.get("end_match", False)
        if end_match:
            if so.team1_runs > so.team2_runs:
                so.winner = match.team1
                match.winner = match.team1
                match.result_summary = f"{match.team1.name} won by Super Over"
            elif so.team2_runs > so.team1_runs:
                so.winner = match.team2
                match.winner = match.team2
                match.result_summary = f"{match.team2.name} won by Super Over"
            else:
                return Response({"message": "Super Over tied. Start another round.", "so": {"team1_runs": so.team1_runs, "team2_runs": so.team2_runs}})
                
            so.save(update_fields=["winner"])
            match.status = Match.Status.COMPLETED
            match.save(update_fields=["winner", "result_summary", "status"])
            
        return Response({
            "so_id": so.id,
            "team1_runs": so.team1_runs,
            "team2_runs": so.team2_runs,
            "match_completed": match.status == Match.Status.COMPLETED
        })


class MOMRecommendationView(views.APIView):
    """Get Man of the Match recommendation."""

    def get(self, request, pk):
        match = Match.objects.get(id=pk)
        from apps.scoring.awards import get_recommended_mom
        from apps.teams.models import Player
        from apps.teams.serializers import PlayerSerializer
        
        player_id = get_recommended_mom(match)
        if not player_id:
            return Response({"player": None})
            
        player = Player.objects.get(id=player_id)
        return Response({"player": PlayerSerializer(player).data})


class MOMOverrideView(views.APIView):
    """Override Man of the Match selection."""

    def patch(self, request, pk):
        match = Match.objects.get(id=pk, tournament__created_by=request.user)
        player_id = request.data.get("mom_player_id")
        
        from apps.teams.models import Player
        player = Player.objects.get(id=player_id)
        
        # Validation: player must belong to one of the teams in the match
        if player.team_id not in (match.team1_id, match.team2_id):
            return Response({"error": "Player must be from one of the match teams."}, status=400)
            
        match.mom_player = player
        match.save(update_fields=["mom_player"])
        
        return Response(MatchSerializer(match).data)
