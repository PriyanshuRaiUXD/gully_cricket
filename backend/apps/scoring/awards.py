from collections import defaultdict
from apps.scoring.models import Ball
from apps.matches.models import Match

def calculate_player_points(match_or_tournament):
    """
    Calculate performance points for players in a match or entire tournament.
    match_or_tournament can be a Match instance or a Tournament instance.
    """
    if isinstance(match_or_tournament, Match):
        balls = Ball.objects.filter(innings__match=match_or_tournament)
    else:
        # It's a tournament
        balls = Ball.objects.filter(innings__match__tournament=match_or_tournament)

    points = defaultdict(int)

    for ball in balls:
        # Runs scored (1 point per run)
        points[ball.striker_id] += ball.runs_scored
        
        # Boundary bonuses
        if not ball.is_wide:
            if ball.runs_scored == 4:
                points[ball.striker_id] += 1
            elif ball.runs_scored == 6:
                points[ball.striker_id] += 2
        
        # Wickets (10 points, excluding run out for bowler)
        if ball.is_wicket:
            if ball.wicket_type != Ball.WicketType.RUN_OUT:
                points[ball.bowler_id] += 10
            
            # Fielding points (5 points)
            if ball.fielder_id:
                points[ball.fielder_id] += 5
    
    return points

def get_recommended_mom(match):
    """Return the player ID with the highest points in a match."""
    points = calculate_player_points(match)
    if not points:
        return None
    
    # Simple tie-breaker: highest points, if tie then most runs, if tie then most wickets
    # For now, just return max
    return max(points, key=points.get)

def finalize_mot(tournament):
    """Determine the MOT for a tournament and save it."""
    points = calculate_player_points(tournament)
    if not points:
        return None
    
    mot_id = max(points, key=points.get)
    tournament.mot_player_id = mot_id
    tournament.save(update_fields=["mot_player"])
    return mot_id
