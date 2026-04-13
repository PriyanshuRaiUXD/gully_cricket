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
