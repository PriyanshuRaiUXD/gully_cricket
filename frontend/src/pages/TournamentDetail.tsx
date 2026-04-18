import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import type { Tournament, Pool, Team, Match } from '../types'
import { Navbar } from '../components/layout/Navbar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/Spinner'
import {
  Users, UserPlus, Trash2, 
  PlayCircle, ArrowRight, Clock, Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'

interface StandingRow { pos: number; id: string; name: string; P: number; W: number; L: number; T: number; Pts: number; NRR: number }
interface PoolStandings { pool: { id: string; name: string }; standings: StandingRow[] }
type Tab = 'matches' | 'standings' | 'knockouts'
type MatchFilter = 'all' | 'live' | 'upcoming' | 'completed'

const LIVE_STATUSES = new Set(['IN_PROGRESS', 'INNINGS_BREAK', 'TOSS'])
const UPCOMING_STATUSES = new Set(['SCHEDULED'])
const COMPLETED_STATUSES = new Set(['COMPLETED', 'FORFEITED', 'ABANDONED'])

function matchFilter(m: Match, filter: MatchFilter) {
  if (filter === 'live') return LIVE_STATUSES.has(m.status)
  if (filter === 'upcoming') return UPCOMING_STATUSES.has(m.status)
  if (filter === 'completed') return COMPLETED_STATUSES.has(m.status)
  return true
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [pools, setPools] = useState<Pool[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<PoolStandings[]>([])
  const [loading, setLoading] = useState(true)

  const [newTeamName, setNewTeamName] = useState('')
  const [addingTeam, setAddingTeam] = useState(false)
  const [playerModal, setPlayerModal] = useState<{ teamId: string; teamName: string } | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: '', overs: 6, total_teams: 4, players_per_team: 11, pool_count: 1 })
  const [savingSettings, setSavingSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('matches')
  const [matchFilterState, setMatchFilterState] = useState<MatchFilter>('all')
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [tRes, pRes, teamsRes, mRes, sRes] = await Promise.all([
        api.get(`/tournaments/${id}/`),
        api.get(`/tournaments/${id}/pools/`),
        api.get(`/tournaments/${id}/teams/`),
        api.get(`/tournaments/${id}/matches/`),
        api.get(`/tournaments/${id}/standings/`),
      ])
      
      setTournament(tRes.data)
      setPools(Array.isArray(pRes.data.results) ? pRes.data.results : (Array.isArray(pRes.data) ? pRes.data : []))
      setTeams(Array.isArray(teamsRes.data.results) ? teamsRes.data.results : (Array.isArray(teamsRes.data) ? teamsRes.data : []))
      setMatches(Array.isArray(mRes.data.results) ? mRes.data.results : (Array.isArray(mRes.data) ? mRes.data : []))
      setStandings(Array.isArray(sRes.data) ? sRes.data : [])
    } catch (err: any) {
      console.error('Data Sync Error:', err)
      toast.error('Sync failed.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function updateSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await api.patch(`/tournaments/${id}/`, settingsForm)
      toast.success('Settings updated')
      setShowSettings(false)
      loadData()
    } catch { toast.error('Update failed') } finally { setSavingSettings(false) }
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setAddingTeam(true)
    try {
      await api.post(`/tournaments/${id}/teams/`, { name: newTeamName })
      setNewTeamName('')
      loadData()
    } catch { toast.error('Failed to add team') } finally { setAddingTeam(false) }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Delete this team?')) return
    try {
      await api.delete(`/teams/${teamId}/`)
      loadData()
    } catch { toast.error('Failed to delete') }
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!playerName.trim() || !playerModal) return
    setAddingPlayer(true)
    try {
      await api.post(`/teams/${playerModal.teamId}/players/`, { name: playerName })
      setPlayerName('')
      loadData()
    } catch { toast.error('Failed to add player') } finally { setAddingPlayer(false) }
  }

  async function deletePlayer(playerId: string) {
    try {
      await api.delete(`/players/${playerId}/`)
      loadData()
    } catch { toast.error('Failed to remove') }
  }

  async function generateMatches() {
    setGenerating(true)
    try {
      await api.post(`/tournaments/${id}/matches/generate/`)
      toast.success('Fixtures generated!')
      loadData()
    } catch { toast.error('Failed to generate fixtures') } finally { setGenerating(false) }
  }

  if (loading) return <PageLoader />
  if (!tournament) return <div className="p-10 text-white">Tournament not found.</div>

  const isSetup = tournament.status === 'SETUP'
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const teamsReady = teams.length === tournament.total_teams
  const squadsReady = teams.length > 0 && teams.every((t) => (t.players?.length || 0) >= tournament.players_per_team)
  const sortedMatches = [...matches].sort((a, b) => b.match_number - a.match_number)

  return (
    <div className="min-h-screen bg-[#05060A] text-white selection:bg-neon-cyan/30">
      <Navbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: tournament.name }]} />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="glass rounded-3xl p-8 flex justify-between items-center border border-white/5">
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight">{tournament.name}</h1>
            <div className="flex gap-4 text-[10px] font-bold text-ink-500 uppercase tracking-widest">
              <span>{tournament.total_teams} Teams</span>
              <span>{tournament.overs} Overs</span>
              <Badge status={tournament.status} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
              setSettingsForm({ name: tournament.name, overs: tournament.overs, total_teams: tournament.total_teams, players_per_team: tournament.players_per_team, pool_count: tournament.pool_count });
              setShowSettings(true);
          }}>Settings</Button>
        </div>

        {isSetup ? (
          <div className="space-y-8 animate-rise">
            <div className="glass rounded-3xl p-8 border border-white/5">
              <h2 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                <Users className="text-neon-cyan w-5 h-5" /> Registered Teams
              </h2>
              {!teamsReady && (
                <form onSubmit={addTeam} className="flex gap-2 mb-8">
                  <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team Name (e.g. Royal Strikers)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
                  <Button type="submit" loading={addingTeam}>Register Team</Button>
                </form>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map(t => (
                  <div key={t.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div>
                       <div className="font-bold text-white uppercase">{t.name}</div>
                       <div className="text-[10px] text-ink-500 font-bold mt-1 uppercase">{t.players?.length || 0} / {tournament.players_per_team} Players</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setPlayerModal({ teamId: t.id, teamName: t.name })} className="p-2 bg-white/5 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition" title="Add Players"><UserPlus size={16} /></button>
                       <button onClick={() => deleteTeam(t.id)} className="p-2 bg-white/5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition" title="Remove Team"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`text-center py-12 glass rounded-3xl border border-white/5 ${(!teamsReady || !squadsReady) ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
               <h2 className="text-2xl font-black uppercase text-white mb-8">Tournament Ready</h2>
               <p className="text-ink-500 text-sm mb-10 max-w-md mx-auto uppercase font-bold tracking-widest">Register all teams and full squads to generate fixtures.</p>
               <Button onClick={generateMatches} loading={generating} className="h-16 px-12 rounded-2xl bg-neon-cyan text-ink-950 shadow-glow-cyan font-black">
                  <PlayCircle className="w-6 h-6 mr-3" /> Generate Fixtures
               </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-rise">
            <div className="flex gap-2 bg-ink-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
               {(['matches', 'standings'] as Tab[]).map(t => (
                 <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white/10 text-white shadow-sm' : 'text-ink-500 hover:text-white'}`}>{t}</button>
               ))}
            </div>

            {activeTab === 'matches' && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  {(['all', 'live', 'upcoming', 'completed'] as MatchFilter[]).map((f) => (
                    <button key={f} onClick={() => setMatchFilterState(f)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${matchFilterState === f ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan shadow-glow-cyan/10' : 'bg-white/5 border-white/5 text-ink-500 hover:text-white'}`}>{f}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sortedMatches.filter(m => matchFilter(m, matchFilterState)).map((m) => (
                    <div key={m.id} onClick={() => navigate(`/matches/${m.id}`)} className="glass p-7 rounded-3xl border border-white/[.06] cursor-pointer hover:border-neon-cyan/30 group transition-all">
                      <div className="flex justify-between mb-6"><Badge status={m.status} /><ArrowRight size={16} className="text-ink-500 group-hover:text-neon-cyan transition-all" /></div>
                      <div className="space-y-4">
                         <div className="text-xl font-black text-white truncate uppercase tracking-tight">{teamMap[m.team1]?.name || 'TBD'}</div>
                         <div className="text-[10px] text-ink-800 font-black tracking-tighter">VS</div>
                         <div className="text-xl font-black text-white truncate uppercase tracking-tight">{teamMap[m.team2]?.name || 'TBD'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'standings' && (
               <div className="space-y-8">
                  {standings.map(ps => (
                    <div key={ps.pool.id} className="glass rounded-3xl overflow-hidden border border-white/5">
                       <div className="bg-white/5 p-4 font-black uppercase text-[10px] tracking-widest border-b border-white/5 text-ink-400">{ps.pool.name} Standings</div>
                       <table className="w-full text-sm">
                          <thead><tr className="text-ink-600 border-b border-white/5 uppercase text-[9px] font-black"><th className="p-4 text-left">Team</th><th className="p-4">P</th><th className="p-4">W</th><th className="p-4">L</th><th className="p-4">Pts</th></tr></thead>
                          <tbody>
                            {ps.standings.map(row => (
                              <tr key={row.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                                 <td className="p-4 font-bold text-white uppercase">{row.name}</td>
                                 <td className="p-4 text-center font-mono">{row.P}</td>
                                 <td className="p-4 text-center text-emerald-400 font-mono">{row.W}</td>
                                 <td className="p-4 text-center text-rose-400 font-mono">{row.L}</td>
                                 <td className="p-4 text-center font-black text-white font-mono">{row.Pts}</td>
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </div>
                  ))}
               </div>
            )}
          </div>
        )}
      </main>

      <Modal open={!!playerModal} onClose={() => setPlayerModal(null)} title={`Squad: ${playerModal?.teamName}`}>
        {playerModal && (
          <div className="space-y-6">
            <form onSubmit={addPlayer} className="flex gap-2">
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player Name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
              <Button type="submit" loading={addingPlayer}>Add Player</Button>
            </form>
            <div className="space-y-2">
              {teams.find(t => t.id === playerModal.teamId)?.players?.map(p => (
                <div key={p.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                  <span className="text-sm font-bold uppercase text-white">{p.name}</span>
                  <button onClick={() => deletePlayer(p.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition" title="Remove Player"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Tournament Settings">
        <form onSubmit={updateSettings} className="space-y-6">
          <Input label="Tournament Name" value={settingsForm.name} onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-ink-500 tracking-widest ml-1">Overs</label>
                <select value={settingsForm.overs} onChange={(e) => setSettingsForm({...settingsForm, overs: Number(e.target.value)})} className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none">
                  {[2, 4, 6, 8, 10, 12, 15, 20].map(o => <option key={o} value={o}>{o} Overs</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-ink-500 tracking-widest ml-1">Squad Size</label>
                <select value={settingsForm.players_per_team} onChange={(e) => setSettingsForm({...settingsForm, players_per_team: Number(e.target.value)})} className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none">
                  {[5, 6, 7, 8, 9, 10, 11].map(p => <option key={p} value={p}>{p} Players</option>)}
                </select>
             </div>
          </div>
          <Button type="submit" loading={savingSettings} className="w-full h-14 rounded-xl">Save All Changes</Button>
          <p className="text-[9px] text-rose-500 font-bold uppercase text-center tracking-widest">Note: Changing overs or team size will reset matches.</p>
        </form>
      </Modal>
    </div>
  )
}
