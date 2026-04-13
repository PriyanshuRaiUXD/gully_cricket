from django.contrib import admin

from .models import Pool, Tournament


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "total_teams", "overs", "created_by", "created_at")
    list_filter = ("status",)


@admin.register(Pool)
class PoolAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament", "created_at")
