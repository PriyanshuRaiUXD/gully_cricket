"""Core ball-by-ball scoring engine."""

from decimal import Decimal

from apps.matches.models import Innings, Match

from .models import Ball


def get_current_over_and_ball(innings):
    """Return (current_over_number, next_ball_number) for an innings."""
    last_legal = (
        Ball.objects.filter(innings=innings, is_wide=False, is_noball=False)
        .order_by("-over_number", "-ball_number")
        .first()
    )
    if not last_legal:
        return 0, 1

    if last_legal.ball_number >= 6:
        return last_legal.over_number + 1, 1
    return last_legal.over_number, last_legal.ball_number + 1


def is_last_ball_noball(innings):
    """Check if the previous ball was a no-ball (for free hit)."""
    last = Ball.objects.filter(innings=innings).order_by("-timestamp").first()
    return last.is_noball if last else False


def record_ball(innings, data):
    """
    Record a single ball event and update innings totals.
    Returns the created Ball instance and a dict of state changes.
    """
    tournament = innings.match.tournament
    over_number, ball_number = get_current_over_and_ball(innings)

    is_legal = not data.get("is_wide") and not data.get("is_noball")
    is_boundary = data["runs_scored"] in (4, 6) and not data.get("is_wide")

    # Calculate total runs for this ball
    penalty = 0
    if data.get("is_wide"):
        penalty = 1
    elif data.get("is_noball"):
        penalty = 1

    total_runs = data["runs_scored"] + data.get("extra_runs", 0) + penalty

    # Free hit: if previous ball was no-ball, this is a free hit
    free_hit = is_last_ball_noball(innings)

    # On a free hit, only run-out dismissals are valid
    if free_hit and data.get("is_wicket") and data.get("wicket_type") != Ball.WicketType.RUN_OUT:
        data["is_wicket"] = False
        data["wicket_type"] = None
        data["dismissed_player_id"] = None
        data["fielder_id"] = None

    # For illegal deliveries, don't advance ball_number
    actual_ball_number = ball_number if is_legal else ball_number

    ball = Ball.objects.create(
        innings=innings,
        over_number=over_number,
        ball_number=ball_number if is_legal else 0,  # 0 = illegal delivery
        runs_scored=data["runs_scored"],
        is_wide=data.get("is_wide", False),
        is_noball=data.get("is_noball", False),
        is_wicket=data.get("is_wicket", False),
        is_boundary=is_boundary,
        extra_runs=data.get("extra_runs", 0),
        total_runs=total_runs,
        wicket_type=data.get("wicket_type"),
        striker_id=data["striker_id"],
        non_striker_id=data["non_striker_id"],
        bowler_id=data["bowler_id"],
        fielder_id=data.get("fielder_id"),
        dismissed_player_id=data.get("dismissed_player_id"),
        is_free_hit=free_hit,
    )

    # Update innings totals
    innings.total_runs += total_runs
    innings.extras += penalty + data.get("extra_runs", 0)

    if data.get("is_wicket"):
        innings.total_wickets += 1

    if is_legal:
        # Update overs count
        new_over, new_ball = get_current_over_and_ball(innings)
        innings.total_overs = Decimal(f"{new_over}.{new_ball - 1}" if new_ball > 1 else f"{new_over}.0")

    innings.save()

    # Determine state changes
    state = {
        "swap_strike": False,
        "over_complete": False,
        "innings_complete": False,
        "next_free_hit": data.get("is_noball", False),
    }

    # Strike change logic
    if is_legal:
        if data["runs_scored"] % 2 == 1:  # odd runs
            state["swap_strike"] = True
        if ball_number == 6:  # end of over
            state["over_complete"] = True
            state["swap_strike"] = not state["swap_strike"]  # swap again at over end

    # Check innings completion
    max_wickets = tournament.players_per_team - 1
    _, next_ball = get_current_over_and_ball(innings)

    over_check, _ = get_current_over_and_ball(innings)
    all_overs_done = over_check >= tournament.overs
    all_out = innings.total_wickets >= max_wickets

    # 2nd innings: check if target chased
    target_chased = False
    if innings.innings_number == 2:
        first_innings = innings.match.innings.get(innings_number=1)
        target = first_innings.total_runs + 1
        if innings.total_runs >= target:
            target_chased = True

    if all_overs_done or all_out or target_chased:
        innings.is_completed = True
        innings.save(update_fields=["is_completed"])
        state["innings_complete"] = True

        # Update match status
        match = innings.match
        if innings.innings_number == 1:
            match.status = Match.Status.INNINGS_BREAK
        else:
            _finalize_match(match)
        match.save()

    return ball, state


def _finalize_match(match):
    """Determine winner and set match to COMPLETED."""
    inn1 = match.innings.get(innings_number=1)
    inn2 = match.innings.get(innings_number=2)

    match.status = Match.Status.COMPLETED

    if inn2.total_runs > inn1.total_runs:
        wickets_remaining = (match.tournament.players_per_team - 1) - inn2.total_wickets
        match.winner = inn2.batting_team
        match.result_summary = f"{inn2.batting_team.name} won by {wickets_remaining} wicket(s)"
    elif inn1.total_runs > inn2.total_runs:
        run_diff = inn1.total_runs - inn2.total_runs
        match.winner = inn1.batting_team
        match.result_summary = f"{inn1.batting_team.name} won by {run_diff} run(s)"
    else:
        match.result_summary = "Match Tied"


def undo_last_ball(innings):
    """Remove the last recorded ball and recalculate innings totals."""
    last_ball = Ball.objects.filter(innings=innings).order_by("-timestamp").first()
    if not last_ball:
        return None

    # Reverse the totals
    innings.total_runs -= last_ball.total_runs
    is_penalty = 1 if (last_ball.is_wide or last_ball.is_noball) else 0
    innings.extras -= is_penalty + last_ball.extra_runs
    if last_ball.is_wicket:
        innings.total_wickets -= 1
    innings.is_completed = False

    ball_data = BallSerializer_lite(last_ball)
    last_ball.delete()

    # Recalculate overs
    legal_count = Ball.objects.filter(
        innings=innings, is_wide=False, is_noball=False
    ).count()
    full_overs = legal_count // 6
    remaining = legal_count % 6
    innings.total_overs = Decimal(f"{full_overs}.{remaining}")
    innings.save()

    return ball_data


def BallSerializer_lite(ball):
    """Minimal dict representation for undo response."""
    return {
        "id": str(ball.id),
        "over_number": ball.over_number,
        "ball_number": ball.ball_number,
        "total_runs": ball.total_runs,
        "is_wicket": ball.is_wicket,
    }
