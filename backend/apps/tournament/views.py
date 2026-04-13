import random
import string
from collections import defaultdict

from rest_framework import generics, status, views
from rest_framework.response import Response

from .models import Pool, Tournament
from .serializers import PoolSerializer, TournamentSerializer


class TournamentListCreateView(generics.ListCreateAPIView):
    serializer_class = TournamentSerializer

    def get_queryset(self):
        return Tournament.objects.filter(
            created_by=self.request.user, is_deleted=False
        )

    def perform_create(self, serializer):
        tournament = serializer.save(created_by=self.request.user)
        # Auto-create pools
        for i in range(tournament.pool_count):
            Pool.objects.create(
                name=f"Pool {string.ascii_uppercase[i]}",
                tournament=tournament,
            )


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TournamentSerializer

    def get_queryset(self):
        return Tournament.objects.filter(
            created_by=self.request.user, is_deleted=False
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status != Tournament.Status.SETUP:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot edit tournament after setup phase.")
        serializer.save()


class PoolListView(generics.ListAPIView):
    serializer_class = PoolSerializer

    def get_queryset(self):
        return Pool.objects.filter(tournament_id=self.kwargs["tournament_id"])


class PoolRandomizeView(views.APIView):
    """Randomly assign teams to pools for a tournament."""

    def post(self, request, tournament_id):
        tournament = Tournament.objects.get(
            id=tournament_id, created_by=request.user, is_deleted=False
        )
        if tournament.status != Tournament.Status.SETUP:
            return Response(
                {"error": "Can only randomize pools during setup."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pools = list(tournament.pools.all())
        teams = list(tournament.teams.all())
        random.shuffle(teams)
        for i, team in enumerate(teams):
            team.pool = pools[i % len(pools)]
            team.save(update_fields=["pool"])
        return Response({"detail": f"Assigned {len(teams)} teams to {len(pools)} pools."})


class StandingsView(views.APIView):
    """Return pool standings for a tournament."""

    def get(self, request, tournament_id):
        from apps.matches.models import Match

        tournament = Tournament.objects.get(
            id=tournament_id, created_by=request.user, is_deleted=False
        )
        pools = list(tournament.pools.prefetch_related("teams").all())
        completed_statuses = {Match.Status.COMPLETED, Match.Status.FORFEITED}

        result = []
        for pool in pools:
            teams = list(pool.teams.all())
            # Build stats dict per team
            stats = {t.id: {"id": str(t.id), "name": t.name, "P": 0, "W": 0, "L": 0, "T": 0, "Pts": 0,
                             "runs_scored": 0, "overs_faced": 0.0, "runs_conceded": 0, "overs_bowled": 0.0} for t in teams}

            matches = Match.objects.filter(
                pool=pool, status__in=completed_statuses
            ).prefetch_related("innings")

            for m in matches:
                t1, t2 = str(m.team1_id), str(m.team2_id)
                if t1 not in stats or t2 not in stats:
                    continue
                stats[t1]["P"] += 1
                stats[t2]["P"] += 1

                if m.status == Match.Status.FORFEITED:
                    # Winner gets 2 pts; forfeit excluded from NRR
                    w = str(m.winner_id) if m.winner_id else None
                    l = t2 if w == t1 else t1
                    if w:
                        stats[w]["W"] += 1
                        stats[w]["Pts"] += 2
                    if l:
                        stats[l]["L"] += 1
                    continue

                if m.status == Match.Status.COMPLETED:
                    inn_list = list(m.innings.all())
                    inn1 = next((i for i in inn_list if i.innings_number == 1), None)
                    inn2 = next((i for i in inn_list if i.innings_number == 2), None)
                    if not inn1 or not inn2:
                        continue

                    bat1, bowl1 = str(inn1.batting_team_id), str(inn1.bowling_team_id)
                    bat2, bowl2 = str(inn2.batting_team_id), str(inn2.bowling_team_id)

                    def to_float(overs_decimal):
                        """Convert Django DecimalField overs (e.g. 4.3) to float overs."""
                        full = int(float(overs_decimal))
                        balls = round((float(overs_decimal) - full) * 10)
                        return full + balls / 6

                    o1 = to_float(inn1.total_overs) or to_float(tournament.overs)
                    o2 = to_float(inn2.total_overs) or to_float(tournament.overs)
                    # All-out → use full allocated overs for NRR
                    max_ov = float(tournament.overs)
                    if inn1.total_wickets >= tournament.players_per_team - 1:
                        o1 = max_ov
                    if inn2.total_wickets >= tournament.players_per_team - 1:
                        o2 = max_ov

                    if bat1 in stats:
                        stats[bat1]["runs_scored"] += inn1.total_runs
                        stats[bat1]["overs_faced"] += o1
                    if bowl1 in stats:
                        stats[bowl1]["runs_conceded"] += inn1.total_runs
                        stats[bowl1]["overs_bowled"] += o1
                    if bat2 in stats:
                        stats[bat2]["runs_scored"] += inn2.total_runs
                        stats[bat2]["overs_faced"] += o2
                    if bowl2 in stats:
                        stats[bowl2]["runs_conceded"] += inn2.total_runs
                        stats[bowl2]["overs_bowled"] += o2

                    winner_id = str(m.winner_id) if m.winner_id else None
                    if winner_id and winner_id in stats:
                        loser_id = t2 if winner_id == t1 else t1
                        stats[winner_id]["W"] += 1
                        stats[winner_id]["Pts"] += 2
                        if loser_id in stats:
                            stats[loser_id]["L"] += 1
                    elif not winner_id:  # tie
                        if t1 in stats:
                            stats[t1]["T"] += 1
                            stats[t1]["Pts"] += 1
                        if t2 in stats:
                            stats[t2]["T"] += 1
                            stats[t2]["Pts"] += 1

            # Calculate NRR
            rows = []
            for s in stats.values():
                rr_scored = s["runs_scored"] / s["overs_faced"] if s["overs_faced"] > 0 else 0
                rr_conceded = s["runs_conceded"] / s["overs_bowled"] if s["overs_bowled"] > 0 else 0
                s["NRR"] = round(rr_scored - rr_conceded, 3)
                rows.append(s)

            rows.sort(key=lambda x: (-x["Pts"], -x["NRR"], -x["W"]))
            for i, row in enumerate(rows):
                row["pos"] = i + 1
                # Remove raw NRR calc fields
                del row["runs_scored"], row["overs_faced"], row["runs_conceded"], row["overs_bowled"]

            result.append({"pool": {"id": str(pool.id), "name": pool.name}, "standings": rows})

        return Response(result)
