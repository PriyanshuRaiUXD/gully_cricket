// API response types matching backend serializers

export interface User {
  id: string;
  email: string;
  username: string;
  date_joined: string;
}

export interface Tournament {
  id: string;
  name: string;
  overs: number;
  total_teams: number;
  players_per_team: number;
  pool_count: number;
  status: "SETUP" | "POOL_STAGE" | "KNOCKOUTS" | "COMPLETED";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Pool {
  id: string;
  name: string;
  tournament: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  tournament: string;
  pool: string | null;
  players: Player[];
  player_count: number;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament: string;
  team1: string;
  team2: string;
  pool: string | null;
  stage: "POOL" | "SEMI_FINAL" | "THIRD_PLACE" | "FINAL";
  match_number: number;
  status:
    | "SCHEDULED"
    | "TOSS"
    | "IN_PROGRESS"
    | "INNINGS_BREAK"
    | "COMPLETED"
    | "FORFEITED"
    | "ABANDONED";
  toss_winner: string | null;
  toss_decision: "BAT" | "BOWL" | null;
  winner: string | null;
  mom_player: string | null;
  result_summary: string;
  innings: Innings[];
  created_at: string;
  updated_at: string;
}

export interface Innings {
  id: string;
  match: string;
  innings_number: number;
  batting_team: string;
  bowling_team: string;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  extras: number;
  is_completed: boolean;
}

export interface Ball {
  id: string;
  innings: string;
  over_number: number;
  ball_number: number;
  runs_scored: number;
  is_wide: boolean;
  is_noball: boolean;
  is_wicket: boolean;
  is_boundary: boolean;
  extra_runs: number;
  total_runs: number;
  wicket_type: string | null;
  striker: string;
  non_striker: string;
  bowler: string;
  fielder: string | null;
  dismissed_player: string | null;
  is_free_hit: boolean;
  timestamp: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
