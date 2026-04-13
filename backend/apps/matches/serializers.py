from rest_framework import serializers

from .models import Innings, Match


class InningsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Innings
        fields = (
            "id", "match", "innings_number", "batting_team", "bowling_team",
            "total_runs", "total_wickets", "total_overs", "extras", "is_completed",
        )
        read_only_fields = fields


class MatchSerializer(serializers.ModelSerializer):
    innings = InningsSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = (
            "id", "tournament", "team1", "team2", "pool", "stage",
            "match_number", "status", "toss_winner", "toss_decision",
            "winner", "mom_player", "result_summary", "innings",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "match_number", "status", "winner", "result_summary",
            "created_at", "updated_at",
        )


class TossSerializer(serializers.Serializer):
    toss_winner_id = serializers.UUIDField()
    decision = serializers.ChoiceField(choices=Match.TossDecision.choices)
