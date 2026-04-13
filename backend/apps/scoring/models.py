import uuid

from django.db import models


class Ball(models.Model):
    """A single ball delivery in an innings."""

    class WicketType(models.TextChoices):
        BOWLED = "BOWLED", "Bowled"
        CAUGHT = "CAUGHT", "Caught"
        RUN_OUT = "RUN_OUT", "Run Out"
        STUMPED = "STUMPED", "Stumped"
        HIT_WICKET = "HIT_WICKET", "Hit Wicket"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    innings = models.ForeignKey(
        "matches.Innings", on_delete=models.CASCADE, related_name="balls"
    )
    over_number = models.PositiveIntegerField()      # 0-indexed internally
    ball_number = models.PositiveIntegerField()       # legal ball within over (1-6)
    runs_scored = models.PositiveIntegerField(default=0)  # runs off bat
    is_wide = models.BooleanField(default=False)
    is_noball = models.BooleanField(default=False)
    is_wicket = models.BooleanField(default=False)
    is_boundary = models.BooleanField(default=False)
    extra_runs = models.PositiveIntegerField(default=0)   # additional extras
    total_runs = models.PositiveIntegerField(default=0)   # computed total for this ball
    wicket_type = models.CharField(
        max_length=20, choices=WicketType.choices, null=True, blank=True
    )
    striker = models.ForeignKey(
        "teams.Player", on_delete=models.CASCADE, related_name="balls_as_striker"
    )
    non_striker = models.ForeignKey(
        "teams.Player", on_delete=models.CASCADE, related_name="balls_as_non_striker"
    )
    bowler = models.ForeignKey(
        "teams.Player", on_delete=models.CASCADE, related_name="balls_as_bowler"
    )
    fielder = models.ForeignKey(
        "teams.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fielding_events",
    )
    dismissed_player = models.ForeignKey(
        "teams.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dismissals",
    )
    is_free_hit = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "balls"
        ordering = ["over_number", "ball_number", "timestamp"]

    def __str__(self):
        return f"Over {self.over_number + 1}.{self.ball_number} – {self.total_runs} runs"
