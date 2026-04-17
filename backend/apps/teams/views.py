from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.tournament.models import Tournament

from .models import Player, Team
from .serializers import PlayerSerializer, TeamSerializer


class TeamListCreateView(generics.ListCreateAPIView):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Team.objects.filter(
            tournament_id=self.kwargs["tournament_id"],
        )

    def perform_create(self, serializer):
        tournament = Tournament.objects.get(
            id=self.kwargs["tournament_id"],
            created_by=self.request.user,
            is_deleted=False,
        )
        if tournament.status != Tournament.Status.SETUP:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot add teams after setup phase.")
        if tournament.teams.count() >= tournament.total_teams:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Maximum number of teams reached.")
        serializer.save(tournament=tournament)


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TeamSerializer

    def get_queryset(self):
        return Team.objects.filter(tournament__created_by=self.request.user)


class PlayerListCreateView(generics.ListCreateAPIView):
    serializer_class = PlayerSerializer

    def get_queryset(self):
        return Player.objects.filter(team_id=self.kwargs["team_id"])

    def perform_create(self, serializer):
        team = Team.objects.get(
            id=self.kwargs["team_id"],
            tournament__created_by=self.request.user,
        )
        if team.tournament.status != Tournament.Status.SETUP:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot add players after setup phase.")
        if team.players.count() >= team.tournament.players_per_team:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Maximum number of players reached for this team.")
        serializer.save(team=team)


class PlayerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlayerSerializer

    def get_queryset(self):
        return Player.objects.filter(team__tournament__created_by=self.request.user)


class PublicTeamRegistrationView(views.APIView):
    """Public endpoint for team self-registration."""
    permission_classes = [IsAuthenticatedOrReadOnly] # Or AllowAny if you want non-logged in users

    def post(self, request, tournament_id):
        serializer = PublicTeamRegistrationSerializer(
            data=request.data, 
            context={'tournament_id': tournament_id}
        )
        if serializer.is_valid():
            team = serializer.save()
            return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
