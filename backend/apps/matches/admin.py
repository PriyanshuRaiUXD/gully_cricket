from django.contrib import admin

from .models import Innings, Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("match_number", "team1", "team2", "stage", "status", "winner")
    list_filter = ("stage", "status")


@admin.register(Innings)
class InningsAdmin(admin.ModelAdmin):
    list_display = ("match", "innings_number", "batting_team", "total_runs", "total_wickets")
