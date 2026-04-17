import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import type { Tournament, Pool, Team, Player, Match } from '../types'
import { Navbar } from '../components/layout/Navbar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/Spinner'
import {
  Check, Users, Shuffle, Zap, ChevronRight,
  UserPlus, Trash2, Settings, Download, Trophy, Settings2, ShieldCheck, Plus, Clock,
  PlayCircle, Calendar, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface StandingRow { pos: number; id: string; name: string; P: number; W: number; L: number; T: number; Pts: number; NRR: number }
interface PoolStandings { pool: { id: string; name: string }; standings: StandingRow[] }
type Tab = 'matches' | 'standings' | 'knockouts'
type MatchFilter = 'all' | 'live' | 'upcoming' | 'completed'

const MATCH_FILTER_LABELS: Record<MatchFilter, string> = {
  all: 'All', live: 'Live', upcoming: 'Upcoming', completed: 'Completed',
}
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

  // Setup state
  const [newTeamName, setNewTeamName] = useState('')
  const [addingTeam, setAddingTeam] = useState(false)

  // Player modal
  const [playerModal, setPlayerModal] = useState<{ teamId: string; teamName: string } | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)

  // Settings edit modal
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: '', overs: 6, total_teams: 4, players_per_team: 11, pool_count: 1 })
  const [savingSettings, setSavingSettings] = useState(false)

  const isProtocolChanged = useMemo(() => {
    if (!tournament) return false;
    return (
      settingsForm.overs !== tournament.overs ||
      settingsForm.total_teams !== tournament.total_teams ||
      settingsForm.pool_count !== tournament.pool_count ||
      settingsForm.players_per_team !== tournament.players_per_team
    );
  }, [settingsForm, tournament]);

  // ── Settings ──
  function openSettings() {
    if (!tournament) return
    setSettingsForm({
      name: tournament.name,
      overs: tournament.overs,
      total_teams: tournament.total_teams,
      players_per_team: tournament.players_per_team,
      pool_count: tournament.pool_count
    })
    setShowSettings(true)
  }

  async function updateSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await api.patch(`/tournaments/${id}/`, settingsForm)
      toast.success('Settings updated')
      setShowSettings(false)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  async function deleteTournament() {
    if (!confirm('Are you sure you want to delete this tournament? This cannot be undone.')) return
    try {
      await api.delete(`/tournaments/${id}/`)
      toast.success('Tournament deleted')
      navigate('/dashboard')
    } catch {
      toast.error('Failed to delete tournament')
    }
  }

  // ── Teams & Players ──
  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setAddingTeam(true)
    try {
      await api.post(`/tournaments/${id}/teams/`, { name: newTeamName })
      setNewTeamName('')
      toast.success('Team added')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add team')
    } finally {
      setAddingTeam(false)
    }
  }

  async function deleteTeam(team: Team) {
    if (!confirm(`Delete team "${team.name}" and all its players?`)) return
    try {
      await api.delete(`/teams/${team.id}/`)
      toast.success('Team deleted')
      loadData()
    } catch {
      toast.error('Failed to delete team')
    }
  }

  function openPlayerModal(teamId: string, teamName: string) {
    setPlayerModal({ teamId, teamName })
    setPlayerName('')
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!playerName.trim() || !playerModal) return
    setAddingPlayer(true)
    try {
      await api.post(`/teams/${playerModal.teamId}/players/`, { name: playerName })
      setPlayerName('')
      toast.success('Player added')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  async function deletePlayer(playerId: string) {
    try {
      await api.delete(`/players/${playerId}/`)
      toast.success('Player removed')
      loadData()
    } catch {
      toast.error('Failed to remove player')
    }
  }

  // ── Fixtures & Pools ──
  async function randomizePools() {
    setRandomizing(true)
    try {
      await api.post(`/tournaments/${id}/pools/randomize/`)
      toast.success('Pools randomized!')
      loadData()
    } catch {
      toast.error('Failed to randomize pools')
    } finally {
      setRandomizing(false)
    }
  }

  async function generateMatches() {
    setGenerating(true)
    try {
      await api.post(`/tournaments/${id}/matches/generate/`)
      toast.success('Fixtures generated! Tournament is now live.')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate fixtures')
    } finally {
      setGenerating(false)
    }
  }

  // ── Knockouts ──
  async function generateKnockouts() {
    setGenerating(true)
    try {
      await api.post(`/tournaments/${id}/matches/generate-knockouts/`)
      await loadData()
      toast.success('Knockouts generated! 🏆')
      setActiveTab('knockouts')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to generate knockouts')
    } finally {
      setGenerating(false)
    }
  }

  // ── MOT ──
  async function finalizeMot() {
    setGenerating(true)
    try {
      await api.post(`/tournaments/${id}/mot/`)
      await loadData()
      toast.success('Man of the Tournament finalized! 🏆')
    } catch {
      toast.error('Failed to finalize MOT')
    } finally {
      setGenerating(false)
    }
  }

  // ── Export ──
  async function downloadExport() {
    try {
      const res = await api.get(`/tournaments/${id}/export/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tournament?.name || 'tournament'}_report.xlsx`
      a.click()
    } catch {
      toast.error('Export failed')
    }
  }

  if (loading) return <PageLoader />

  if (!tournament) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="glass p-10 rounded-[3rem] border border-rose-500/20 max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
               <X className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black uppercase text-white mb-2">Sync Interrupted</h2>
            <p className="text-ink-500 text-sm mb-8">We couldn't establish a link to this tournament protocol. It may have been deleted.</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full h-14 rounded-2xl bg-white text-ink-950 font-black uppercase tracking-widest text-xs">
               Return to Hub
            </Button>
         </div>
      </div>
    )
  }

  const isSetup = tournament.status === 'SETUP'
  const poolMap = Object.fromEntries(pools.map((p) => [p.id, p.name]))
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const motPlayer = teams.flatMap(t => t.players || []).find(p => p.id === tournament.mot_player)

  const teamsReady = teams.length === tournament.total_teams
  const squadsReady = teams.length > 0 && teams.every((t) => (t.players?.length || 0) >= tournament.players_per_team)
  const poolsReady = tournament.pool_count === 1 || teams.every((t) => !!t.pool)

  const filteredMatches = matches.filter((m) => matchFilter(m, matchFilter2))
  const sortedMatches = [...matches].sort((a, b) => b.match_number - a.match_number)

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-neon-cyan/30">
      <Navbar
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: tournament.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openSettings} className="hidden sm:inline-flex">
              <Settings className="w-3.5 h-3.5 mr-1" /> Settings
            </Button>
            <Button variant="danger" size="sm" onClick={downloadExport}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          </div>
        }
      />

      <div className="absolute inset-0 mesh-hero opacity-20 pointer-events-none" />

      <main className="relative max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header Card */}
        <div className="glass rounded-[2rem] border border-white/[.06] p-8 shadow-panel overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-5 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black font-display text-white tracking-tight">{tournament.name}</h1>
                <Badge status={tournament.status} />
              </div>
              <div className="flex flex-wrap gap-5 text-[11px] uppercase tracking-wider font-bold text-ink-500">
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Users className="w-3.5 h-3.5 text-neon-cyan" /> {tournament.total_teams} Teams
                </span>
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Zap className="w-3.5 h-3.5 text-neon-amber" /> {tournament.overs} Overs
                </span>
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Trophy className="w-3.5 h-3.5 text-purple-400" /> {tournament.pool_count} Pools
                </span>
              </div>
            </div>

            {tournament.status === 'COMPLETED' && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-neon-amber bg-neon-amber/10 rounded-xl px-4 py-2 border border-neon-amber/20">
                  <Trophy className="w-5 h-5" />
                  <span className="font-black text-sm uppercase tracking-wider">Tournament Finalized</span>
                </div>
                {motPlayer ? (
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-ink-500 uppercase font-bold block mb-0.5">Man of the Tournament</span>
                    <span className="text-xs text-white font-black">{motPlayer.name} <span className="text-ink-500 font-normal text-[10px]">({teamMap[motPlayer.team]?.name})</span></span>
                  </div>
                ) : (
                  <button onClick={finalizeMot} disabled={generating} className="text-[10px] text-neon-amber font-bold underline hover:text-white transition">
                    Finalize MOT Award
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ SETUP VIEW ═══════════════ */}
        {isSetup && (
          <div className="space-y-8 animate-rise">
            {/* Step 1: Squads */}
            <div className="glass rounded-3xl border border-white/[.06] p-8 shadow-panel">
              <div className="flex justify-between items-baseline mb-8">
                <div>
                  <h2 className="text-xl font-black font-display text-white">1. Manage Squads</h2>
                  <p className="text-sm text-ink-500 mt-1">Register teams and their full player lists.</p>
                </div>
                {!teamsReady && (
                  <form onSubmit={addTeam} className="flex gap-2">
                    <input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Enter team name..."
                      className="bg-white/[.03] border border-white/[.10] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 placeholder:text-ink-700 min-w-[200px]"
                    />
                    <Button type="submit" loading={addingTeam} size="md">
                      Add Team
                    </Button>
                  </form>
                )}
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-12 bg-white/[.02] rounded-2xl border border-dashed border-white/10">
                  <Users className="w-10 h-10 text-ink-700 mx-auto mb-4" />
                  <p className="text-sm text-ink-500">No teams added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => {
                    const playerCount = team.players?.length || 0
                    const full = playerCount >= tournament.players_per_team
                    return (
                      <div key={team.id} className={`relative glass-strong group rounded-2xl border transition-all p-5 ${full ? 'border-emerald-500/20 bg-emerald-500/[.02]' : 'border-white/5'}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-display font-bold text-white text-base">{team.name}</h3>
                            <div className="flex items-center gap-3">
                              {team.pool && (
                                <span className="text-[10px] px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded-full border border-neon-cyan/20 font-bold uppercase tracking-wider">
                                  {poolMap[team.pool] || 'Pool'}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${full ? 'text-emerald-400' : 'text-neon-amber'}`}>
                                {full ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-neon-amber" />}
                                {playerCount}/{tournament.players_per_team} Players
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openPlayerModal(team.id, team.name)}
                              className={`p-2 rounded-lg transition ${full ? 'text-ink-500 hover:text-white hover:bg-white/5' : 'text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20'}`}
                            >
                              {full ? <Settings2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteTeam(team)}
                              className="p-2 text-ink-600 hover:text-rose-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Player Pills */}
                        {(team.players?.length || 0) > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {team.players.map((p) => (
                              <span key={p.id} className="text-[10px] font-medium bg-white/[.03] text-ink-400 px-2 py-1 rounded-md border border-white/[.05]">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Pools */}
            <div className={`glass rounded-3xl border border-white/[.06] p-8 shadow-panel transition-opacity ${!teamsReady ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-baseline mb-6">
                <div>
                  <h2 className="text-xl font-black font-display text-white">2. Pool Distribution</h2>
                  <p className="text-sm text-ink-500 mt-1">Assign teams to their groups.</p>
                </div>
                <Button onClick={randomizePools} loading={randomizing} variant="secondary" size="sm">
                  Shuffle All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pools.map((p) => (
                  <div key={p.id} className="bg-white/[.02] border border-white/[.06] rounded-2xl p-4">
                    <h4 className="text-[10px] uppercase font-black text-ink-500 tracking-widest mb-3 border-b border-white/5 pb-2">{p.name}</h4>
                    <div className="space-y-2">
                      {teams.filter(t => t.pool === p.id).map(t => (
                        <div key={t.id} className="text-xs font-bold text-white bg-white/[.03] px-3 py-2 rounded-lg border border-white/[.04]">
                          {t.name}
                        </div>
                      ))}
                      {teams.filter(t => t.pool === p.id).length === 0 && (
                        <p className="text-[10px] text-ink-700 italic">Empty</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Launch Protocol */}
            <div className={`glass rounded-3xl border border-white/[.06] p-10 shadow-panel relative overflow-hidden ${(!teamsReady || !squadsReady || !poolsReady) ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Zap className="w-32 h-32 text-neon-cyan" />
              </div>
              <div className="relative z-10 text-center">
                <h2 className="text-3xl font-black font-display text-white mb-3">Initiate Tournament Protocol</h2>
                <p className="text-ink-400 text-sm mb-10 max-w-lg mx-auto leading-relaxed">
                  Configuration complete. Choose your deployment strategy to generate fixtures and synchronize the live scoring engine.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                   <button 
                     onClick={generateMatches}
                     disabled={generating}
                     className="group flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all text-left"
                   >
                      <div className="w-12 h-12 rounded-xl bg-ink-900 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <PlayCircle className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Standard Deployment</h4>
                      <p className="text-[10px] text-ink-500 uppercase tracking-widest text-center">Sequential Fixtures</p>
                   </button>

                   <button 
                     onClick={async () => {
                        await randomizePools();
                        await generateMatches();
                     }}
                     disabled={generating || randomizing}
                     className="group flex flex-col items-center p-6 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 transition-all text-left"
                   >
                      <div className="w-12 h-12 rounded-xl bg-ink-900 border border-neon-cyan/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <Shuffle className="w-6 h-6 text-neon-cyan shadow-glow-cyan/20" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Rapid Deployment</h4>
                      <p className="text-[10px] text-ink-500 uppercase tracking-widest text-center">Randomize & Generate</p>
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ POST-SETUP VIEW ═══════════════ */}
        {!isSetup && (
          <div className="space-y-8 animate-rise">
            {/* Nav Tabs */}
            <div className="flex bg-ink-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md w-fit">
              {(['matches', 'standings', 'knockouts'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[.2em] transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-ink-500 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex gap-2">
                    {(['all', 'live', 'upcoming', 'completed'] as MatchFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setMatchFilter2(f)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${matchFilter2 === f ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan shadow-glow-cyan/10' : 'bg-white/5 border-white/5 text-ink-500 hover:text-white hover:border-white/20'}`}
                      >
                        {MATCH_FILTER_LABELS[f]}
                      </button>
                    ))}
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-ink-600 uppercase tracking-widest">
                     <Clock className="w-3.5 h-3.5" /> Auto-sync active
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sortedMatches.filter(m => matchFilter(m, matchFilter2)).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/matches/${m.id}`)}
                      className="group relative flex flex-col glass rounded-3xl border border-white/[.06] p-7 text-left hover:border-white/[.15] transition-all overflow-hidden shadow-panel hover:shadow-panel-hover cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-ink-500">
                             #{m.match_number}
                           </div>
                           {m.status === 'SCHEDULED' ? (
                             <span className="text-[10px] font-black uppercase tracking-widest text-ink-500 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                               <Calendar className="w-3 h-3" /> Upcoming
                             </span>
                           ) : (
                             <Badge status={m.status} />
                           )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-ink-500 group-hover:text-neon-cyan transition-colors">
                           <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                        </div>
                      </div>

                      <div className="relative space-y-4 mb-8">
                        <div className="flex justify-between items-center">
                          <span className="font-display font-black text-xl text-white group-hover:text-neon-cyan transition-colors truncate">{teamMap[m.team1]?.name || 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="h-px flex-1 bg-white/5" />
                           <span className="text-[10px] font-black text-ink-800 tracking-tighter">VS</span>
                           <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-display font-black text-xl text-white group-hover:text-neon-cyan transition-colors truncate">{teamMap[m.team2]?.name || 'TBD'}</span>
                        </div>
                      </div>

                      <div className="relative mt-auto pt-6 border-t border-white/[.04] flex items-center justify-between">
                         <div className="text-[10px] font-bold text-ink-600 uppercase tracking-widest">
                            {m.stage.replace('_', ' ')} • {m.pool ? poolMap[m.pool] : 'Finals'}
                         </div>
                         {m.status === 'SCHEDULED' ? (
                           <Button size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest px-4 shadow-glow-cyan bg-neon-cyan text-ink-950">
                             Command Match
                           </Button>
                         ) : m.result_summary ? (
                           <span className="text-[10px] font-bold text-emerald-400">Final Result ✓</span>
                         ) : (
                           <span className="text-[10px] font-bold text-neon-cyan animate-pulse">Live Scoring Active</span>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standings Tab */}
            {activeTab === 'standings' && (
              <div className="grid grid-cols-1 gap-8">
                {standings.map((ps) => (
                  <div key={ps.pool.id} className="glass rounded-3xl border border-white/[.06] overflow-hidden shadow-panel">
                    <div className="px-6 py-4 bg-white/[.02] border-b border-white/[.06]">
                      <h3 className="text-xs font-black uppercase tracking-[.25em] text-ink-400">{ps.pool.name} Standings</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase font-black tracking-widest text-ink-600 bg-white/[.01] border-b border-white/[.04]">
                            <th className="py-4 px-6 text-left">Pos</th>
                            <th className="py-4 px-2 text-left">Team</th>
                            <th className="py-4 px-3 text-center">P</th>
                            <th className="py-4 px-3 text-center text-emerald-500">W</th>
                            <th className="py-4 px-3 text-center text-rose-500">L</th>
                            <th className="py-4 px-3 text-center">Pts</th>
                            <th className="py-4 px-6 text-right">NRR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[.04]">
                          {ps.standings.map((row, i) => (
                            <tr key={row.id} className={`hover:bg-white/[.02] transition ${i === 0 ? 'bg-neon-amber/[.03]' : ''}`}>
                              <td className="py-4 px-6 font-mono text-ink-500">{row.pos}</td>
                              <td className="py-4 px-2 font-display font-bold text-white">{row.name}</td>
                              <td className="py-4 px-3 text-center font-mono text-ink-400">{row.P}</td>
                              <td className="py-4 px-3 text-center font-black text-emerald-400">{row.W}</td>
                              <td className="py-4 px-3 text-center font-mono text-rose-400">{row.L}</td>
                              <td className="py-4 px-3 text-center font-black text-white">{row.Pts}</td>
                              <td className={`py-4 px-6 text-right font-mono font-bold ${row.NRR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {row.NRR >= 0 ? '+' : ''}{row.NRR.toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Knockouts Tab */}
            {activeTab === 'knockouts' && (
              <div className="space-y-8">
                {tournament.status === 'POOL_STAGE' && (
                  <div className="relative overflow-hidden glass rounded-3xl border border-neon-amber/20 p-10 text-center shadow-panel">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Trophy className="w-24 h-24 text-neon-amber" />
                    </div>
                    <h3 className="text-xl font-black font-display text-white mb-2">Pool Stage Concluded?</h3>
                    <p className="text-ink-500 text-sm mb-8 max-w-sm mx-auto">Verify that all group matches are finished. This will trigger the bracket generation for semi-finals.</p>
                    <Button onClick={generateKnockouts} loading={generating} variant="amber" className="min-w-[200px]">
                      Generate Bracket
                    </Button>
                  </div>
                )}
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.filter(m => m.stage !== 'POOL').map(m => (
                    <Link
                      key={m.id}
                      to={`/matches/${m.id}`}
                      className="glass-strong group rounded-2xl border border-white/[.08] p-6 hover:border-neon-cyan/30 transition-all shadow-panel"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neon-cyan px-2 py-1 bg-neon-cyan/10 rounded-md border border-neon-cyan/20">{m.stage.replace('_', ' ')}</span>
                        <Badge status={m.status} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-display font-black text-lg text-white">{teamMap[m.team1]?.name || 'TBD'}</span>
                          <span className="text-xs text-ink-600 font-bold uppercase">Home</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center">
                          <span className="font-display font-black text-lg text-white">{teamMap[m.team2]?.name || 'TBD'}</span>
                          <span className="text-xs text-ink-600 font-bold uppercase">Away</span>
                        </div>
                      </div>
                      {m.result_summary && (
                        <div className="mt-5 pt-4 border-t border-white/10">
                          <p className="text-xs text-neon-amber font-black text-center">{m.result_summary}</p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Player Management Modal */}
      <Modal open={!!playerModal} onClose={() => setPlayerModal(null)} title={`Squad: ${playerModal?.teamName}`}>
        {(() => {
          if (!playerModal) return null
          const team = teams.find(t => t.id === playerModal.teamId)
          const players = team?.players || []
          const isFull = players.length >= tournament.players_per_team

          return (
            <div className="space-y-6">
              {!isFull && (
                <form onSubmit={addPlayer} className="flex gap-2">
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name..."
                    autoFocus
                    className="flex-1 bg-white/[.03] border border-white/[.10] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  />
                  <Button type="submit" loading={addingPlayer} size="md">Add</Button>
                </form>
              )}

              {players.length === 0 ? (
                <div className="text-center py-10 bg-white/[.01] rounded-2xl border border-dashed border-white/5">
                  <p className="text-xs text-ink-600 italic">No players registered yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white/[.03] px-4 py-2.5 rounded-xl border border-white/[.05]">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      <button onClick={() => deletePlayer(p.id)} className="p-1.5 text-ink-700 hover:text-rose-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isFull ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                  <p className="text-xs text-emerald-400 font-bold text-center flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Squad is full and ready
                  </p>
                  <Button variant="outline" onClick={() => setPlayerModal(null)} className="w-full mt-4">Done</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setPlayerModal(null)} className="w-full">Close Squad Manager</Button>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Protocol Settings Modal */}
      <Modal 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
        title="Update Tournament Protocol" 
        size="md"
      >
        <form onSubmit={updateSettings} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-black text-ink-500 tracking-widest ml-1">Event Identity</label>
            <input
              value={settingsForm.name}
              onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
              required
              className="w-full bg-ink-900 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-ink-500 tracking-widest ml-1">Match Length</label>
                <select
                  value={settingsForm.overs}
                  onChange={(e) => setSettingsForm({ ...settingsForm, overs: Number(e.target.value) })}
                  className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 appearance-none font-bold"
                >
                  {[2, 4, 6, 8, 10, 12, 15, 20].map(o => <option key={o} value={o}>{o} Overs</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-ink-500 tracking-widest ml-1">Squad Size</label>
                <select
                  value={settingsForm.players_per_team}
                  onChange={(e) => setSettingsForm({ ...settingsForm, players_per_team: Number(e.target.value) })}
                  className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 appearance-none font-bold"
                >
                  {[5, 6, 7, 8, 9, 10, 11].map(p => <option key={p} value={p}>{p} Players</option>)}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-ink-500 tracking-widest ml-1">Team Capacity</label>
                <select
                  value={settingsForm.total_teams}
                  onChange={(e) => setSettingsForm({ ...settingsForm, total_teams: Number(e.target.value) })}
                  className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 appearance-none font-bold"
                >
                  {[4, 6, 8, 10, 12, 16, 24, 32].map(t => <option key={t} value={t}>{t} Total Teams</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-ink-500 tracking-widest ml-1">Group Structure</label>
                <select
                  value={settingsForm.pool_count}
                  onChange={(e) => setSettingsForm({ ...settingsForm, pool_count: Number(e.target.value) })}
                  className="w-full bg-ink-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 appearance-none font-bold"
                >
                  <option value={1}>Round Robin (1 Pool)</option>
                  <option value={2}>2 Groups</option>
                  <option value={4}>4 Groups</option>
                </select>
             </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowSettings(false)} className="flex-1 border-white/10">Abort</Button>
            <div className="flex-[2] flex gap-2">
              <Button 
                type="submit" 
                loading={savingSettings} 
                className={`flex-1 shadow-glow-cyan ${isProtocolChanged ? 'bg-rose-600 text-white hover:bg-rose-500' : ''}`}
              >
                {isProtocolChanged ? 'Authorize Re-initialization' : 'Save Changes'}
              </Button>
              <Button type="button" variant="danger" onClick={deleteTournament} className="px-4"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          
          {isProtocolChanged && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-in fade-in slide-in-from-top-2">
               <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                     <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-1">Protocol Divergence Detected</p>
                     <p className="text-[10px] text-ink-400 font-bold leading-relaxed">
                        Modifying these parameters will trigger a full re-initialization. All current match fixtures will be permanently deleted to maintain integrity.
                     </p>
                  </div>
               </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
