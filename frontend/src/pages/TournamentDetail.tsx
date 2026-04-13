import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import type { Tournament, Pool, Team, Player, Match } from "../types";

type SettingsForm = { name: string; overs: number; total_teams: number; players_per_team: number; pool_count: number };
interface StandingRow { pos: number; id: string; name: string; P: number; W: number; L: number; T: number; Pts: number; NRR: number; }
interface PoolStandings { pool: { id: string; name: string }; standings: StandingRow[]; }

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<PoolStandings[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings editing
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsForm | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Team/player form state
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Player modal state
  const [playerModal, setPlayerModal] = useState<{ teamId: string; teamName: string } | null>(null);
  const [playerModalName, setPlayerModalName] = useState("");
  const [playerModalError, setPlayerModalError] = useState<string | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);

  function openPlayerModal(teamId: string, teamName: string) {
    setPlayerModal({ teamId, teamName });
    setPlayerModalName("");
    setPlayerModalError(null);
  }

  const isSetup = tournament?.status === "SETUP";

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/tournaments/${id}/`),
      api.get(`/tournaments/${id}/pools/`),
      api.get(`/tournaments/${id}/teams/`),
      api.get(`/tournaments/${id}/matches/`),
      api.get(`/tournaments/${id}/standings/`),
    ])
      .then(([tRes, pRes, teRes, mRes, sRes]) => {
        setTournament(tRes.data);
        setPools(pRes.data.results || pRes.data);
        setTeams(teRes.data.results || teRes.data);
        setMatches(mRes.data.results || mRes.data);
        setStandings(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch(() => setError("Failed to load tournament."))
      .finally(() => setLoading(false));
  }, [id]);

  function startEditSettings() {
    if (!tournament) return;
    setSettingsForm({
      name: tournament.name,
      overs: tournament.overs,
      total_teams: tournament.total_teams,
      players_per_team: tournament.players_per_team,
      pool_count: tournament.pool_count,
    });
    setEditingSettings(true);
  }

  function handleSettingsField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setSettingsForm((f) => f ? { ...f, [name]: name === "name" ? value : Number(value) } : f);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingSettings(true);
    setError(null);
    try {
      const res = await api.patch(`/tournaments/${id}/`, settingsForm);
      setTournament(res.data);
      setEditingSettings(false);
    } catch (err: any) {
      const data = err.response?.data;
      if (data) setError(Object.values(data).flat().join(" "));
      else setError("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const res = await api.post(`/tournaments/${id}/teams/`, { name: newTeamName.trim() });
      setTeams((prev) => [...prev, res.data]);
      setNewTeamName("");
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to add team.");
    }
  }

  async function deleteTeam(teamId: string) {
    try {
      await api.delete(`/teams/${teamId}/`);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch {
      setError("Failed to delete team.");
    }
  }

  async function addPlayer(teamId: string, name: string) {
    if (!name.trim()) return;
    setAddingPlayer(true);
    setPlayerModalError(null);
    try {
      const res = await api.post(`/teams/${teamId}/players/`, { name: name.trim() });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, players: [...(t.players || []), res.data], player_count: (t.player_count || 0) + 1 }
            : t
        )
      );
      setPlayerModalName("");
      setError(null);
    } catch (err: any) {
      setPlayerModalError(err.response?.data?.name?.[0] || err.response?.data?.detail || "Failed to add player.");
    } finally {
      setAddingPlayer(false);
    }
  }

  async function deletePlayer(playerId: string, teamId: string) {
    try {
      await api.delete(`/players/${playerId}/`);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, players: t.players.filter((p: Player) => p.id !== playerId), player_count: t.player_count - 1 }
            : t
        )
      );
    } catch {
      setError("Failed to delete player.");
    }
  }

  async function assignPools() {
    try {
      await api.post(`/tournaments/${id}/pools/randomize/`);
      const teRes = await api.get(`/tournaments/${id}/teams/`);
      setTeams(teRes.data.results || teRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to assign pools.");
    }
  }

  async function generateFixtures() {
    // For single-pool tournaments, auto-assign first if any team is unassigned
    const unassigned = teams.filter((t) => !t.pool);
    if (unassigned.length > 0) {
      try {
        await api.post(`/tournaments/${id}/pools/randomize/`);
        const teRes = await api.get(`/tournaments/${id}/teams/`);
        setTeams(teRes.data.results || teRes.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to assign teams to pools.");
        return;
      }
    }
    try {
      await api.post(`/tournaments/${id}/matches/generate/`);
      const [mRes, tRes, sRes] = await Promise.all([
        api.get(`/tournaments/${id}/matches/`),
        api.get(`/tournaments/${id}/`),
        api.get(`/tournaments/${id}/standings/`),
      ]);
      setMatches(mRes.data.results || mRes.data);
      setTournament(tRes.data);
      setStandings(Array.isArray(sRes.data) ? sRes.data : []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to generate fixtures.");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-red-500">Tournament not found.</div>;

  const poolMap = Object.fromEntries(pools.map((p) => [p.id, p.name]));
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate("/dashboard")} className="text-sm hover:underline">← Dashboard</button>
        <h1 className="text-xl font-bold">🏏 {tournament.name}</h1>
        <span className="text-xs px-3 py-1 rounded-full bg-green-800">{tournament.status}</span>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}

        {/* Tournament Settings */}
        <section className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">Tournament Settings</h2>
            {isSetup && !editingSettings && (
              <button
                onClick={startEditSettings}
                className="text-sm text-green-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {editingSettings && settingsForm ? (
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  value={settingsForm.name}
                  onChange={handleSettingsField}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overs (1–20)</label>
                  <input
                    name="overs"
                    type="number"
                    min={1}
                    max={20}
                    value={settingsForm.overs}
                    onChange={handleSettingsField}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teams (even, ≥4)</label>
                  <input
                    name="total_teams"
                    type="number"
                    min={4}
                    step={2}
                    value={settingsForm.total_teams}
                    onChange={handleSettingsField}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Players/Team</label>
                  <input
                    name="players_per_team"
                    type="number"
                    min={2}
                    max={11}
                    value={settingsForm.players_per_team}
                    onChange={handleSettingsField}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pools</label>
                  <select
                    name="pool_count"
                    value={settingsForm.pool_count}
                    onChange={handleSettingsField}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSettings(false)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div><span className="font-medium text-gray-800">Overs:</span> {tournament?.overs}</div>
              <div><span className="font-medium text-gray-800">Teams:</span> {tournament?.total_teams}</div>
              <div><span className="font-medium text-gray-800">Players/Team:</span> {tournament?.players_per_team}</div>
              <div><span className="font-medium text-gray-800">Pools:</span> {tournament?.pool_count}</div>
            </div>
          )}
        </section>

        {/* Teams Section */}
        <section className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Teams ({teams.length}/{tournament.total_teams})
            </h2>
            {isSetup && teams.length > 0 && tournament.pool_count > 1 && (
              <button onClick={assignPools} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                Randomize Pools
              </button>
            )}
          </div>

          {isSetup && teams.length < tournament.total_teams && (
            <form onSubmit={addTeam} className="flex gap-2 mb-4">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition">
                Add Team
              </button>
            </form>
          )}

          <div className="space-y-3">
            {teams.map((team) => (
              <div key={team.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-semibold">{team.name}</span>
                    {team.pool && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {poolMap[team.pool] || "Pool"}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">
                      {team.players?.length || 0}/{tournament.players_per_team} players
                    </span>
                  </div>
                  {isSetup && (
                    <button onClick={() => deleteTeam(team.id)} className="text-red-500 text-xs hover:underline">
                      Delete
                    </button>
                  )}
                </div>

                {/* Players list */}
                <div className="ml-4 space-y-1">
                  {team.players?.map((p: Player) => (
                    <div key={p.id} className="flex justify-between items-center text-sm text-gray-600">
                      <span>• {p.name}</span>
                      {isSetup && (
                        <button onClick={() => deletePlayer(p.id, team.id)} className="text-red-400 text-xs hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {isSetup && (team.players?.length || 0) < tournament.players_per_team && (
                    <button
                      type="button"
                      onClick={() => openPlayerModal(team.id, team.name)}
                      className="mt-1 text-xs text-green-600 hover:underline"
                    >
                      + Add player
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        {isSetup && teams.length === tournament.total_teams && (() => {
          const unassigned = teams.filter((t) => !t.pool).length;
          const multiPool = tournament.pool_count > 1;
          const notReady = multiPool && unassigned > 0;
          return (
            <section className={`rounded-lg border p-4 ${
              notReady ? "bg-yellow-50 border-yellow-200" : "bg-white shadow-sm"
            }`}>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Ready to Start?</h2>
              {notReady ? (
                <>
                  <p className="text-sm text-yellow-700 mb-3">
                    {unassigned} team{unassigned > 1 ? "s are" : " is"} not assigned to a pool.
                    Use <strong>Randomize Pools</strong> in the Teams section first.
                  </p>
                  <button
                    onClick={assignPools}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Randomize Pools Now
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    All {tournament.total_teams} teams registered
                    {unassigned === 0 && " and assigned to pools"}. Click below to generate fixtures and begin.
                  </p>
                  <button
                    onClick={generateFixtures}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Generate Fixtures & Start Pool Stage
                  </button>
                </>
              )}
            </section>
          );
        })()}

        {/* Matches Section */}
        {matches.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Matches</h2>
            <div className="space-y-2">
              {matches.map((m) => (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className="block border rounded-lg p-3 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Match #{m.match_number}</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-sm">
                        {teamMap[m.team1] || "TBD"} vs {teamMap[m.team2] || "TBD"}
                      </span>
                      {m.pool && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {poolMap[m.pool] || "Pool"}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        m.status === "COMPLETED"
                          ? "bg-gray-100 text-gray-600"
                          : m.status === "IN_PROGRESS" || m.status === "INNINGS_BREAK"
                          ? "bg-yellow-100 text-yellow-700"
                          : m.status === "SCHEDULED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                  {m.result_summary && (
                    <p className="text-xs text-gray-500 mt-1">{m.result_summary}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
        {/* Standings Section */}
        {standings.length > 0 && standings.some((ps) => ps.standings.some((r) => r.P > 0)) && (
          <section className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Pool Standings</h2>
            {standings.map((ps) => (
              <div key={ps.pool.id} className="mb-6 last:mb-0">
                {standings.length > 1 && (
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{ps.pool.name}</h3>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2 pr-4">Team</th>
                        <th className="pb-2 pr-3 text-center">P</th>
                        <th className="pb-2 pr-3 text-center">W</th>
                        <th className="pb-2 pr-3 text-center">L</th>
                        <th className="pb-2 pr-3 text-center">T</th>
                        <th className="pb-2 pr-3 text-center font-semibold text-gray-700">Pts</th>
                        <th className="pb-2 text-center">NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ps.standings.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 pr-2 text-gray-400">{row.pos}</td>
                          <td className="py-2 pr-4 font-medium text-gray-800">{row.name}</td>
                          <td className="py-2 pr-3 text-center text-gray-600">{row.P}</td>
                          <td className="py-2 pr-3 text-center text-green-700 font-medium">{row.W}</td>
                          <td className="py-2 pr-3 text-center text-red-600">{row.L}</td>
                          <td className="py-2 pr-3 text-center text-gray-500">{row.T}</td>
                          <td className="py-2 pr-3 text-center font-bold text-gray-800">{row.Pts}</td>
                          <td className={`py-2 text-center font-medium ${row.NRR >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {row.NRR >= 0 ? "+" : ""}{row.NRR.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Player Add Modal */}
      {playerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Add Players — <span className="text-green-700">{playerModal.teamName}</span>
              </h3>
              <button
                onClick={() => setPlayerModal(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Existing players */}
            <div className="mb-4 max-h-52 overflow-y-auto space-y-1">
              {(teams.find((t) => t.id === playerModal.teamId)?.players || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No players yet.</p>
              ) : (
                teams.find((t) => t.id === playerModal.teamId)?.players?.map((p: Player) => (
                  <div key={p.id} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50">
                    <span className="text-sm text-gray-700">• {p.name}</span>
                    <button
                      onClick={() => deletePlayer(p.id, playerModal.teamId)}
                      className="text-red-400 text-xs hover:underline hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Slot indicator */}
            <p className="text-xs text-gray-400 mb-3">
              {teams.find((t) => t.id === playerModal.teamId)?.players?.length || 0} / {tournament.players_per_team} players added
            </p>

            {playerModalError && (
              <p className="text-red-500 text-xs mb-2">{playerModalError}</p>
            )}

            {/* Add input */}
            {(teams.find((t) => t.id === playerModal.teamId)?.players?.length || 0) < tournament.players_per_team ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerModalName}
                  onChange={(e) => setPlayerModalName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlayer(playerModal.teamId, playerModalName))}
                  placeholder="Player name"
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => addPlayer(playerModal.teamId, playerModalName)}
                  disabled={addingPlayer || !playerModalName.trim()}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : (
              <p className="text-sm text-green-700 font-medium text-center">All player slots filled ✓</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
