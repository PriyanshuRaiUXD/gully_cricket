import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Match, Team, Player, Innings, Ball } from "../types";

interface ScoringState {
  match: Match;
  teams: Team[];
  currentInnings: Innings | null;
  balls: Ball[];
  target: number | null;
}

export default function LiveScoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ball input state
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  // Wicket state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState("BOWLED");
  const [fielder, setFielder] = useState("");
  const [dismissedPlayer, setDismissedPlayer] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [matchRes, scorecardRes] = await Promise.all([
        api.get(`/matches/${id}/`),
        api.get(`/matches/${id}/scorecard/`),
      ]);
      const match: Match = matchRes.data;
      const teamsRes = await api.get(`/tournaments/${match.tournament}/teams/`);
      const teams: Team[] = teamsRes.data.results || teamsRes.data;

      // Find current active innings
      const innings = match.innings || [];
      const activeInnings = innings.find((i: Innings) => !i.is_completed) || innings[innings.length - 1];

      // Get balls for current innings from scorecard
      const scorecardInnings = (scorecardRes.data.innings || []).find(
        (si: any) => si.innings?.id === activeInnings?.id
      );
      const balls: Ball[] = scorecardInnings?.balls || [];

      // Calculate target for 2nd innings
      const inn1 = innings.find((i: Innings) => i.innings_number === 1);
      const target = activeInnings?.innings_number === 2 && inn1 ? inn1.total_runs + 1 : null;

      setState({ match, teams, currentInnings: activeInnings || null, balls, target });
    } catch {
      setError("Failed to load match data.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function recordBall(runs: number, extras?: { is_wide?: boolean; is_noball?: boolean }) {
    if (!striker || !nonStriker || !bowler) {
      setError("Select striker, non-striker, and bowler.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/matches/${id}/ball/`, {
        runs_scored: runs,
        is_wide: extras?.is_wide || false,
        is_noball: extras?.is_noball || false,
        is_wicket: false,
        extra_runs: 0,
        striker_id: striker,
        non_striker_id: nonStriker,
        bowler_id: bowler,
      });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to record ball.");
    } finally {
      setSubmitting(false);
    }
  }

  async function recordWicket() {
    if (!striker || !nonStriker || !bowler || !dismissedPlayer) {
      setError("Fill all wicket fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/matches/${id}/ball/`, {
        runs_scored: 0,
        is_wide: false,
        is_noball: false,
        is_wicket: true,
        wicket_type: wicketType,
        extra_runs: 0,
        striker_id: striker,
        non_striker_id: nonStriker,
        bowler_id: bowler,
        fielder_id: ["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketType) ? fielder : undefined,
        dismissed_player_id: dismissedPlayer,
      });
      setShowWicketModal(false);
      setDismissedPlayer("");
      setFielder("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to record wicket.");
    } finally {
      setSubmitting(false);
    }
  }

  async function undoLastBall() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/matches/${id}/undo-ball/`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Nothing to undo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!state) return <div className="min-h-screen flex items-center justify-center text-red-500">Match not found.</div>;

  const { match, teams, currentInnings, balls, target } = state;
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const battingTeam = currentInnings ? teamMap[currentInnings.batting_team] : null;
  const bowlingTeam = currentInnings ? teamMap[currentInnings.bowling_team] : null;
  const battingPlayers: Player[] = battingTeam?.players || [];
  const bowlingPlayers: Player[] = bowlingTeam?.players || [];
  const allFieldingPlayers = bowlingPlayers;

  const isMatchOver = match.status === "COMPLETED" || match.status === "FORFEITED" || match.status === "INNINGS_BREAK";

  // Current over balls
  const currentOver = currentInnings
    ? balls.filter((b) => b.over_number === Math.floor(Number(currentInnings.total_overs)))
    : [];

  // Ball display helper
  function ballDisplay(b: Ball) {
    if (b.is_wicket) return "W";
    if (b.is_wide) return `Wd${b.extra_runs > 0 ? "+" + b.extra_runs : ""}`;
    if (b.is_noball) return `Nb${b.runs_scored > 0 ? "+" + b.runs_scored : ""}`;
    if (b.runs_scored === 0) return "•";
    return String(b.runs_scored);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <nav className="bg-green-700 px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate(`/matches/${id}`)} className="text-sm hover:underline">
          ← Match
        </button>
        <span className="font-bold">Live Scoring</span>
        <span className="text-xs px-2 py-1 rounded bg-green-800">{match.status.replace("_", " ")}</span>
      </nav>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">{error}</div>}

        {/* Score Header */}
        {currentInnings && (
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">
              {battingTeam?.name} — {currentInnings.innings_number === 1 ? "1st" : "2nd"} Innings
            </p>
            <p className="text-4xl font-bold">
              {currentInnings.total_runs}/{currentInnings.total_wickets}
            </p>
            <p className="text-sm text-gray-400">{currentInnings.total_overs} overs</p>
            {target && (
              <p className="mt-2 text-yellow-400 text-sm font-medium">
                Target: {target} · Need {Math.max(0, target - currentInnings.total_runs)} from{" "}
                {/* simple remaining calc */}
                remaining balls
              </p>
            )}
          </div>
        )}

        {/* This Over */}
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">This Over</p>
          <div className="flex gap-2 flex-wrap">
            {currentOver.map((b, i) => (
              <span
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  b.is_wicket
                    ? "bg-red-600"
                    : b.runs_scored >= 4
                    ? "bg-green-600"
                    : b.is_wide || b.is_noball
                    ? "bg-yellow-600"
                    : "bg-gray-600"
                }`}
              >
                {ballDisplay(b)}
              </span>
            ))}
            {currentOver.length === 0 && <span className="text-gray-500 text-sm">New over</span>}
          </div>
        </div>

        {isMatchOver ? (
          <div className="bg-green-800 rounded-xl p-6 text-center">
            <p className="text-lg font-bold mb-2">
              {match.status === "INNINGS_BREAK" ? "Innings Break" : "Match Over"}
            </p>
            {match.result_summary && <p className="text-sm">{match.result_summary}</p>}
            <button
              onClick={() => navigate(`/matches/${id}`)}
              className="mt-4 bg-white text-green-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-100"
            >
              View Scorecard
            </button>
          </div>
        ) : (
          <>
            {/* Player Selectors */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Striker</label>
                  <select
                    value={striker}
                    onChange={(e) => setStriker(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Select</option>
                    {battingPlayers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Non-Striker</label>
                  <select
                    value={nonStriker}
                    onChange={(e) => setNonStriker(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Select</option>
                    {battingPlayers.filter((p) => p.id !== striker).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bowler</label>
                  <select
                    value={bowler}
                    onChange={(e) => setBowler(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Select</option>
                    {bowlingPlayers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Ball Input Panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-3">Runs</p>
              <div className="grid grid-cols-6 gap-2 mb-4">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    disabled={submitting}
                    onClick={() => recordBall(r)}
                    className={`py-3 rounded-lg font-bold text-lg transition disabled:opacity-50 ${
                      r >= 4
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-3">Extras & Wicket</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  disabled={submitting}
                  onClick={() => recordBall(0, { is_wide: true })}
                  className="py-3 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 transition disabled:opacity-50"
                >
                  WD
                </button>
                <button
                  disabled={submitting}
                  onClick={() => recordBall(0, { is_noball: true })}
                  className="py-3 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 transition disabled:opacity-50"
                >
                  NB
                </button>
                <button
                  disabled={submitting}
                  onClick={() => {
                    setDismissedPlayer(striker);
                    setShowWicketModal(true);
                  }}
                  className="py-3 rounded-lg font-bold bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                >
                  OUT
                </button>
                <button
                  disabled={submitting}
                  onClick={undoLastBall}
                  className="py-3 rounded-lg font-bold bg-gray-500 hover:bg-gray-400 transition disabled:opacity-50"
                >
                  UNDO
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Wicket Details</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={wicketType}
                onChange={(e) => setWicketType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm"
              >
                <option value="BOWLED">Bowled</option>
                <option value="CAUGHT">Caught</option>
                <option value="RUN_OUT">Run Out</option>
                <option value="STUMPED">Stumped</option>
                <option value="HIT_WICKET">Hit Wicket</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Dismissed Player</label>
              <select
                value={dismissedPlayer}
                onChange={(e) => setDismissedPlayer(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm"
              >
                <option value="">Select</option>
                {battingPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketType) && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fielder</label>
                <select
                  value={fielder}
                  onChange={(e) => setFielder(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm"
                >
                  <option value="">Select</option>
                  {allFieldingPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowWicketModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-500 text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={recordWicket}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
