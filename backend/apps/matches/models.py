import uuid

from django.db import models


class Match(models.Model):
    """A match between two teams."""

    class Stage(models.TextChoices):
        POOL = "POOL", "Pool"
        SEMI_FINAL = "SEMI_FINAL", "Semi Final"
        THIRD_PLACE = "THIRD_PLACE", "Third Place"
        FINAL = "FINAL", "Final"

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        TOSS = "TOSS", "Toss"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        INNINGS_BREAK = "INNINGS_BREAK", "Innings Break"
        COMPLETED = "COMPLETED", "Completed"
        FORFEITED = "FORFEITED", "Forfeited"
        ABANDONED = "ABANDONED", "Abandoned"

    class TossDecision(models.TextChoices):
        BAT = "BAT", "Bat"
        BOWL = "BOWL", "Bowl"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        "tournament.Tournament", on_delete=models.CASCADE, related_name="matches"
    )
    team1 = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="matches_as_team1"
    )
    team2 = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="matches_as_team2"
    )
    pool = models.ForeignKey(
        "tournament.Pool",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.POOL)
    match_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    toss_winner = models.ForeignKey(
        "teams.Team",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="toss_wins",
    )
    toss_decision = models.CharField(
        max_length=4, choices=TossDecision.choices, null=True, blank=True
    )
    winner = models.ForeignKey(
        "teams.Team",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="match_wins",
    )
    mom_player = models.ForeignKey(
        "teams.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mom_awards",
    )
    result_summary = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "matches"
        ordering = ["match_number"]

    def __str__(self):
        return f"Match {self.match_number}: {self.team1} vs {self.team2}"


class Innings(models.Model):
    """An innings within a match (each match has 2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="innings")
    innings_number = models.PositiveIntegerField()  # 1 or 2
    batting_team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="batting_innings"
    )
    bowling_team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="bowling_innings"
    )
    total_runs = models.PositiveIntegerField(default=0)
    total_wickets = models.PositiveIntegerField(default=0)
    total_overs = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    extras = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "innings"
        unique_together = ("match", "innings_number")
        ordering = ["innings_number"]

    def __str__(self):
        return f"{self.match} – Innings {self.innings_number}"
