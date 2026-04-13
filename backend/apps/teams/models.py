import uuid

from django.db import models


class Team(models.Model):
    """A team participating in a tournament."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    tournament = models.ForeignKey(
        "tournament.Tournament", on_delete=models.CASCADE, related_name="teams"
    )
    pool = models.ForeignKey(
        "tournament.Pool",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "teams"
        unique_together = ("name", "tournament")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Player(models.Model):
    """A player belonging to a team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="players")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "players"
        unique_together = ("name", "team")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.team.name})"
