from rest_framework import serializers

from .models import Ball


class BallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ball
        fields = (
            "id", "innings", "over_number", "ball_number",
            "runs_scored", "is_wide", "is_noball", "is_wicket", "is_boundary",
            "extra_runs", "total_runs", "wicket_type",
            "striker", "non_striker", "bowler", "fielder",
            "dismissed_player", "is_free_hit", "timestamp",
        )
        read_only_fields = (
            "id", "over_number", "ball_number", "total_runs",
            "is_boundary", "is_free_hit", "timestamp",
        )


class BallInputSerializer(serializers.Serializer):
    """Serializer for recording a new ball event."""

    runs_scored = serializers.IntegerField(min_value=0, max_value=6, default=0)
    is_wide = serializers.BooleanField(default=False)
    is_noball = serializers.BooleanField(default=False)
    is_wicket = serializers.BooleanField(default=False)
    extra_runs = serializers.IntegerField(min_value=0, default=0)
    wicket_type = serializers.ChoiceField(
        choices=Ball.WicketType.choices, required=False, allow_null=True
    )
    striker_id = serializers.UUIDField()
    non_striker_id = serializers.UUIDField()
    bowler_id = serializers.UUIDField()
    fielder_id = serializers.UUIDField(required=False, allow_null=True)
    dismissed_player_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        if data.get("is_wicket") and not data.get("wicket_type"):
            raise serializers.ValidationError("wicket_type is required when is_wicket is true.")
        if data.get("wicket_type") in ("CAUGHT", "RUN_OUT", "STUMPED") and not data.get("fielder_id"):
            raise serializers.ValidationError("fielder_id is required for this wicket type.")
        if data.get("is_wicket") and not data.get("dismissed_player_id"):
            raise serializers.ValidationError("dismissed_player_id is required for wickets.")
        if data.get("is_wide") and data.get("is_noball"):
            raise serializers.ValidationError("A ball cannot be both wide and no-ball.")
        return data
