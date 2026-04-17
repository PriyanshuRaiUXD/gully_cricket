import uuid

from django.conf import settings
from django.db import models


class Tournament(models.Model):
    """A gully cricket tournament."""

    class Status(models.TextChoices):
        SETUP = "SETUP", "Setup"
        POOL_STAGE = "POOL_STAGE", "Pool Stage"
        KNOCKOUTS = "KNOCKOUTS", "Knockouts"
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    overs = models.PositiveIntegerField()
    total_teams = models.PositiveIntegerField()
    players_per_team = models.PositiveIntegerField()
    pool_count = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SETUP
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tournaments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mot_player = models.ForeignKey(
        "teams.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mot_awards",
    )

    class Meta:
        db_table = "tournaments"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Pool(models.Model):
    """A pool/group within a tournament."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="pools"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pools"
        unique_together = ("name", "tournament")
        ordering = ["name"]

    def __str__(self):
        return f"{self.tournament.name} – {self.name}"
