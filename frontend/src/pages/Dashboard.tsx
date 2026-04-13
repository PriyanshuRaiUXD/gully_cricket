import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Tournament } from "../types";

const INITIAL_FORM = { name: "", overs: 6, total_teams: 4, players_per_team: 11, pool_count: 1 };

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/tournaments/")
      .then((res) => setTournaments(res.data.results || res.data))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  function handleField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "name" ? value : Number(value) }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const res = await api.post("/tournaments/", form);
      setTournaments((prev) => [res.data, ...prev]);
      setShowModal(false);
      setForm(INITIAL_FORM);
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(" ");
        setFormError(msgs);
      } else {
        setFormError("Failed to create tournament.");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🏏 Gully Cricket</h1>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="text-sm bg-green-800 px-4 py-2 rounded hover:bg-green-900 transition"
        >
          Logout
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Tournaments</h2>
          <button
            onClick={() => { setFormError(null); setShowModal(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            + New Tournament
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No tournaments yet.</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md transition"
              >
                <div>
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-sm text-gray-500">
                    {t.total_teams} teams · {t.overs} overs · {t.pool_count}{" "}
                    pool(s) · Status: {t.status}
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-800">New Tournament</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleField}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Street Cup 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overs (1–20)</label>
                  <input
                    name="overs"
                    type="number"
                    min={1}
                    max={20}
                    value={form.overs}
                    onChange={handleField}
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
                    value={form.total_teams}
                    onChange={handleField}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Players/Team (2–11)</label>
                  <input
                    name="players_per_team"
                    type="number"
                    min={2}
                    max={11}
                    value={form.players_per_team}
                    onChange={handleField}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pools</label>
                  <select
                    name="pool_count"
                    value={form.pool_count}
                    onChange={handleField}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
