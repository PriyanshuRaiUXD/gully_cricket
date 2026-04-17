from rest_framework import serializers

from .models import Player, Team


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ("id", "name", "team", "created_at")
        read_only_fields = ("id", "team", "created_at")


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ("id", "name", "tournament", "pool", "players", "player_count", "created_at")
        read_only_fields = ("id", "tournament", "created_at")

    def get_player_count(self, obj):
        return obj.players.count()


class PublicTeamRegistrationSerializer(serializers.Serializer):
    """Serializer for players to self-register their team."""
    team_name = serializers.CharField(max_length=100)
    player_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        min_length=1
    )

    def validate(self, data):
        tournament_id = self.context.get('tournament_id')
        try:
            tournament = Tournament.objects.get(id=tournament_id, is_deleted=False)
        except Tournament.DoesNotExist:
            raise serializers.ValidationError("Tournament not found.")

        if tournament.status != Tournament.Status.SETUP:
            raise serializers.ValidationError("Registration is closed for this tournament.")

        if tournament.teams.count() >= tournament.total_teams:
            raise serializers.ValidationError("Tournament is full.")

        if len(data['player_names']) > tournament.players_per_team:
            raise serializers.ValidationError(f"Too many players. Max allowed: {tournament.players_per_team}")

        return data

    def create(self, validated_data):
        tournament_id = self.context.get('tournament_id')
        tournament = Tournament.objects.get(id=tournament_id)
        
        team = Team.objects.create(
            name=validated_data['team_name'],
            tournament=tournament
        )
        
        for name in validated_data['player_names']:
            Player.objects.create(name=name, team=team)
            
        return team
