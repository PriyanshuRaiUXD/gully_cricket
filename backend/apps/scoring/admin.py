from django.contrib import admin

from .models import Ball


@admin.register(Ball)
class BallAdmin(admin.ModelAdmin):
    list_display = (
        "innings", "over_number", "ball_number", "runs_scored",
        "is_wide", "is_noball", "is_wicket", "total_runs",
    )
    list_filter = ("is_wide", "is_noball", "is_wicket")
