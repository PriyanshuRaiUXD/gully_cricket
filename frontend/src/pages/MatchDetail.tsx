import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import type { Match, Team, Innings } from "../types";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState<"BAT" | "BOWL">("BAT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/matches/${id}/`)
      .then((res) => {
        setMatch(res.data);
        // Fetch teams for this tournament
        return api.get(`/tournaments/${res.data.tournament}/teams/`);
      })
      .then((res) => setTeams(res.data.results || res.data))
      .catch(() => setError("Failed to load match."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToss(e: React.FormEvent) {
    e.preventDefault();
    if (!tossWinner) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/matches/${id}/toss/`, {
        toss_winner_id: tossWinner,
        decision: tossDecision,
      });
      setMatch(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Toss failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startInnings2() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/matches/${id}/start-innings/`);
      const res = await api.get(`/matches/${id}/`);
      setMatch(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to start innings.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForfeit(teamId: string) {
    if (!confirm("Are you sure you want to forfeit this match?")) return;
    try {
      const res = await api.post(`/matches/${id}/forfeit/`, { forfeiting_team_id: teamId });
      setMatch(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Forfeit failed.");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!match) return <div className="min-h-screen flex items-center justify-center text-red-500">Match not found.</div>;

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const team1 = teamMap[match.team1];
  const team2 = teamMap[match.team2];
  const inn1 = match.innings?.find((i: Innings) => i.innings_number === 1);
  const inn2 = match.innings?.find((i: Innings) => i.innings_number === 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate(`/tournaments/${match.tournament}`)} className="text-sm hover:underline">
          ← Tournament
        </button>
        <h1 className="text-xl font-bold">Match #{match.match_number}</h1>
        <span className="text-xs px-3 py-1 rounded-full bg-green-800">
          {match.status.replace("_", " ")}
        </span>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}

        {/* Match Header */}
        <section className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="flex justify-center items-center gap-6 text-2xl font-bold text-gray-800">
            <span>{team1?.name || "Team 1"}</span>
            <span className="text-gray-400 text-lg">vs</span>
            <span>{team2?.name || "Team 2"}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{match.stage} · Match #{match.match_number}</p>
          {match.result_summary && (
            <p className="mt-3 text-green-700 font-medium">{match.result_summary}</p>
          )}
        </section>

        {/* Toss Section — show if SCHEDULED */}
        {match.status === "SCHEDULED" && (
          <section className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Toss</h2>
            <form onSubmit={handleToss} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Who won the toss?</label>
                <select
                  value={tossWinner}
                  onChange={(e) => setTossWinner(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select team</option>
                  <option value={match.team1}>{team1?.name || "Team 1"}</option>
                  <option value={match.team2}>{team2?.name || "Team 2"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Elected to</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value="BAT"
                      checked={tossDecision === "BAT"}
                      onChange={() => setTossDecision("BAT")}
                      className="accent-green-600"
                    />
                    <span className="text-sm">Bat</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value="BOWL"
                      checked={tossDecision === "BOWL"}
                      onChange={() => setTossDecision("BOWL")}
                      className="accent-green-600"
                    />
                    <span className="text-sm">Bowl</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Record Toss & Start Match"}
              </button>
            </form>
          </section>
        )}

        {/* Toss result display */}
        {match.toss_winner && (
          <section className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{teamMap[match.toss_winner]?.name}</span> won the toss and elected to{" "}
              <span className="font-medium">{match.toss_decision?.toLowerCase()}</span>.
            </p>
          </section>
        )}

        {/* Scorecard */}
        {inn1 && (
          <section className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Scorecard</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{teamMap[inn1.batting_team]?.name || "Batting"} (1st Innings)</span>
                <span className="font-bold text-lg">
                  {inn1.total_runs}/{inn1.total_wickets}
                  <span className="text-sm font-normal text-gray-500 ml-1">({inn1.total_overs} ov)</span>
                </span>
              </div>
              {inn2 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{teamMap[inn2.batting_team]?.name || "Batting"} (2nd Innings)</span>
                  <span className="font-bold text-lg">
                    {inn2.total_runs}/{inn2.total_wickets}
                    <span className="text-sm font-normal text-gray-500 ml-1">({inn2.total_overs} ov)</span>
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Innings Break — start 2nd innings */}
        {match.status === "INNINGS_BREAK" && (
          <section className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 text-center">
            <h2 className="text-lg font-bold text-yellow-800 mb-2">Innings Break</h2>
            <p className="text-sm text-yellow-700 mb-4">
              Target: <span className="font-bold text-lg">{(inn1?.total_runs || 0) + 1}</span> runs
            </p>
            <button
              onClick={startInnings2}
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Start 2nd Innings
            </button>
          </section>
        )}

        {/* Action Buttons */}
        <section className="flex flex-wrap gap-3">
          {(match.status === "TOSS" || match.status === "IN_PROGRESS") && (
            <Link
              to={`/matches/${id}/live`}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
            >
              ⚡ Live Scoring
            </Link>
          )}
          {(match.status === "IN_PROGRESS" || match.status === "SCHEDULED") && (
            <>
              <button
                onClick={() => handleForfeit(match.team1)}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200 transition"
              >
                {team1?.name} Forfeits
              </button>
              <button
                onClick={() => handleForfeit(match.team2)}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200 transition"
              >
                {team2?.name} Forfeits
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
