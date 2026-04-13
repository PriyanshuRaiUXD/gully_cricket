from rest_framework import serializers

from .models import Pool, Tournament


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = (
            "id", "name", "overs", "total_teams", "players_per_team",
            "pool_count", "status", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "created_by", "created_at", "updated_at")

    def validate_total_teams(self, value):
        if value < 4 or value % 2 != 0:
            raise serializers.ValidationError("Must be an even number >= 4.")
        return value

    def validate_overs(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Overs must be between 1 and 20.")
        return value

    def validate_players_per_team(self, value):
        if value < 2 or value > 11:
            raise serializers.ValidationError("Players per team must be between 2 and 11.")
        return value

    def validate_pool_count(self, value):
        if value not in (1, 2, 4):
            raise serializers.ValidationError("Pool count must be 1, 2, or 4.")
        return value


class PoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pool
        fields = ("id", "name", "tournament", "created_at")
        read_only_fields = ("id", "created_at")
