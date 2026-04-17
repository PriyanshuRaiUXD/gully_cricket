import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import type { Match, Team, Innings } from '../types'
import { Navbar } from '../components/layout/Navbar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageLoader } from '../components/ui/Spinner'
import { Zap, AlertTriangle, Trophy, Star, ChevronRight, ShieldCheck, ArrowLeft, Calendar, Info, Users } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [tossWinner, setTossWinner] = useState('')
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT')
  const [submitting, setSubmitting] = useState(false)

  // MOM
  const [recommendedMom, setRecommendedMom] = useState<any>(null)
  const [showMomPicker, setShowMomPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/matches/${id}/`)
      .then((res) => {
        setMatch(res.data)
        if (res.data.status === 'COMPLETED' || res.data.status === 'FORFEITED') {
          api.get(`/matches/${id}/mom/`).then(r => setRecommendedMom(r.data.player))
        }
        return api.get(`/tournaments/${res.data.tournament}/teams/`)
      })
      .then((res) => setTeams(res.data.results || res.data))
      .catch(() => { toast.error('Failed to load match'); navigate('/dashboard') })
      .finally(() => setLoading(false))
  }, [id, navigate])

  async function pickMom(playerId: string) {
    setSubmitting(true)
    try {
      const res = await api.patch(`/matches/${id}/mom/override/`, { mom_player_id: playerId })
      setMatch(res.data)
      setShowMomPicker(false)
      toast.success('Man of the Match updated!')
    } catch {
      toast.error('Failed to update MOM')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToss(e: React.FormEvent) {
    e.preventDefault()
    if (!tossWinner) return
    setSubmitting(true)
    try {
      const res = await api.post(`/matches/${id}/toss/`, { toss_winner_id: tossWinner, decision: tossDecision })
      setMatch(res.data)
      toast.success('Toss recorded — let the game begin!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Toss failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function startInnings2() {
    setSubmitting(true)
    try {
      await api.post(`/matches/${id}/start-innings/`)
      const res = await api.get(`/matches/${id}/`)
      setMatch(res.data)
      toast.success('2nd innings started!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to start innings.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForfeit(teamId: string, teamName: string) {
    if (!confirm(`Are you sure "${teamName}" wants to forfeit this match?`)) return
    try {
      const res = await api.post(`/matches/${id}/forfeit/`, { forfeiting_team_id: teamId })
      setMatch(res.data)
      toast.success(`${teamName} forfeited the match.`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Forfeit failed.')
    }
  }

  if (loading || !match) return <PageLoader />

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const team1 = teamMap[match.team1]
  const team2 = teamMap[match.team2]
  const inn1 = match.innings?.find((i: Innings) => i.innings_number === 1)
  const inn2 = match.innings?.find((i: Innings) => i.innings_number === 2)
  const tossWinnerTeam = match.toss_winner ? teamMap[match.toss_winner] : null

  const isLive = match.status === 'TOSS' || match.status === 'IN_PROGRESS'
  const isComplete = match.status === 'COMPLETED' || match.status === 'FORFEITED' || match.status === 'ABANDONED'

  const currentMomId = match.mom_player
  const currentMom = teams.flatMap(t => t.players || []).find(p => p.id === currentMomId)

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-neon-cyan/30">
      <Navbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tournament', href: `/tournaments/${match.tournament}` },
          { label: `Match #${match.match_number}` },
        ]}
        actions={
          isLive ? (
            <Link to={`/matches/${id}/live`} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition shadow-glow-live">
              <Zap className="w-3.5 h-3.5 fill-current" /> Live Control
            </Link>
          ) : undefined
        }
      />

      <div className="absolute inset-0 mesh-live opacity-20 pointer-events-none" />

      <main className="relative max-w-3xl mx-auto px-4 py-10 space-y-8 animate-rise">
        {/* Match Header Card */}
        <div className="glass rounded-[2.5rem] border border-white/[.08] shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-5 pointer-events-none" />
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex justify-center mb-10">
              <Badge status={match.status} className="scale-110" />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12">
              <div className="text-center space-y-4">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-white/5 items-center justify-center border border-white/10 mb-2">
                   <p className="text-2xl font-black text-white">{team1?.name?.charAt(0)}</p>
                </div>
                <p className="text-lg md:text-xl font-black font-display text-white leading-tight">{team1?.name || 'TBD'}</p>
                {inn1 && teamMap[inn1.batting_team]?.id === match.team1 && (
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-neon-cyan">{inn1.total_runs}<span className="text-ink-500 text-xl">/{inn1.total_wickets}</span></p>
                    <p className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">{inn1.total_overs} Overs</p>
                  </div>
                )}
                {inn2 && teamMap[inn2.batting_team]?.id === match.team1 && (
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-neon-cyan">{inn2.total_runs}<span className="text-ink-500 text-xl">/{inn2.total_wickets}</span></p>
                    <p className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">{inn2.total_overs} Overs</p>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2 pt-8">
                <span className="text-3xl font-black text-ink-800 tracking-tighter">VS</span>
                <p className="text-[10px] font-black text-ink-600 uppercase tracking-[.3em]">{match.stage.replace('_', ' ')}</p>
              </div>

              <div className="text-center space-y-4">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-white/5 items-center justify-center border border-white/10 mb-2">
                   <p className="text-2xl font-black text-white">{team2?.name?.charAt(0)}</p>
                </div>
                <p className="text-lg md:text-xl font-black font-display text-white leading-tight">{team2?.name || 'TBD'}</p>
                {inn1 && teamMap[inn1.batting_team]?.id === match.team2 && (
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-neon-cyan">{inn1.total_runs}<span className="text-ink-500 text-xl">/{inn1.total_wickets}</span></p>
                    <p className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">{inn1.total_overs} Overs</p>
                  </div>
                )}
                {inn2 && teamMap[inn2.batting_team]?.id === match.team2 && (
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-neon-cyan">{inn2.total_runs}<span className="text-ink-500 text-xl">/{inn2.total_wickets}</span></p>
                    <p className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">{inn2.total_overs} Overs</p>
                  </div>
                )}
              </div>
            </div>

            {match.result_summary && (
              <div className="mt-12 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                <p className="text-emerald-400 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4" /> {match.result_summary}
                </p>
              </div>
            )}

            {isComplete && (match.status === 'COMPLETED' || match.status === 'FORFEITED') && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-ink-500 uppercase tracking-[.25em]">Award: Man of the Match</h3>
                  <button
                    onClick={() => setShowMomPicker(true)}
                    className="text-[10px] text-neon-cyan hover:text-white font-black uppercase tracking-widest transition"
                  >
                    {currentMom ? 'Update Selection' : 'Assign Award'}
                  </button>
                </div>
                {currentMom ? (
                  <div className="flex items-center gap-4 bg-white/[.03] rounded-2xl px-6 py-4 border border-white/[.06]">
                    <div className="w-12 h-12 rounded-full bg-neon-amber flex items-center justify-center text-ink-950 shadow-glow-amber">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg leading-tight">{currentMom.name}</p>
                      <p className="text-xs text-ink-500 font-bold uppercase tracking-wider mt-0.5">{teamMap[currentMom.team]?.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/[.01] rounded-2xl border border-dashed border-white/10">
                    <p className="text-xs text-ink-600 font-medium italic">No player assigned yet.</p>
                    {recommendedMom && (
                      <button 
                        onClick={() => pickMom(recommendedMom.id)}
                        className="mt-3 text-[10px] bg-white/5 hover:bg-white/10 text-neon-amber border border-neon-amber/20 px-4 py-2 rounded-lg font-black uppercase tracking-widest transition"
                      >
                        Pick Recommended: {recommendedMom.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {tossWinnerTeam && (
              <p className="text-center text-[11px] text-ink-600 font-bold uppercase tracking-widest mt-8 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                {tossWinnerTeam.name} won toss & opted to {match.toss_decision?.toLowerCase()}
              </p>
            )}
          </div>
        </div>

        {/* Toss Form */}
        {match.status === 'SCHEDULED' && (
          <div className="glass rounded-3xl border border-white/[.08] p-8 shadow-panel">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-widest mb-8 border-b border-white/5 pb-4">🪙 Match Initialization</h2>
            <form onSubmit={handleToss} className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-ink-500 uppercase tracking-[.2em]">Toss Winner</label>
                <div className="grid grid-cols-2 gap-4">
                  {[{ id: match.team1, name: team1?.name || 'Team 1' }, { id: match.team2, name: team2?.name || 'Team 2' }].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTossWinner(t.id)}
                      className={`py-4 px-6 rounded-2xl border-2 text-sm font-black transition-all ${tossWinner === t.id ? 'border-neon-cyan bg-neon-cyan/10 text-white shadow-glow-cyan/20' : 'border-white/5 bg-white/[.02] text-ink-500 hover:border-white/20'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-ink-500 uppercase tracking-[.2em]">Election</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['BAT', 'BOWL'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTossDecision(d)}
                      className={`py-4 px-6 rounded-2xl border-2 text-sm font-black transition-all ${tossDecision === d ? 'border-neon-cyan bg-neon-cyan/10 text-white shadow-glow-cyan/20' : 'border-white/5 bg-white/[.02] text-ink-500 hover:border-white/20'}`}
                    >
                      {d === 'BAT' ? '🏏 BAT FIRST' : '⚡ BOWL FIRST'}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                loading={submitting}
                disabled={!tossWinner}
                className="w-full h-14 rounded-2xl shadow-glow-cyan text-[11px] font-black tracking-[.25em]"
                size="lg"
              >
                INITIALIZE MATCH
              </Button>
            </form>
          </div>
        )}

        {/* Innings Break Control */}
        {match.status === 'INNINGS_BREAK' && inn1 && (
          <div className="glass rounded-3xl border border-neon-amber/20 p-10 text-center shadow-panel">
            <h2 className="text-xl font-black font-display text-white uppercase tracking-widest mb-2">Mid-Innings Break</h2>
            <div className="my-8 space-y-2">
              <p className="text-ink-500 text-xs font-bold uppercase tracking-widest">{teamMap[inn1.batting_team]?.name} total</p>
              <p className="text-5xl font-black text-white">{inn1.total_runs}<span className="text-ink-700">/{inn1.total_wickets}</span></p>
              <p className="text-neon-amber text-lg font-black mt-4 uppercase tracking-tighter">Target: {inn1.total_runs + 1}</p>
            </div>
            <Button onClick={startInnings2} loading={submitting} size="lg" className="min-w-[240px] h-14 shadow-glow-amber" variant="amber">
              START CHASE →
            </Button>
          </div>
        )}

        {/* Match Actions / Forfeit */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isLive && (
            <Link
              to={`/matches/${id}/live`}
              className="flex-1 inline-flex items-center justify-center gap-3 bg-white text-ink-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-neon-cyan transition text-[11px] shadow-xl"
            >
              <Zap className="w-4 h-4 fill-current" /> Continue Scoring
            </Link>
          )}

          {!isComplete && (
            <div className="flex-1 grid grid-cols-2 gap-2">
              {[
                { id: match.team1, name: team1?.name || 'Team 1' },
                { id: match.team2, name: team2?.name || 'Team 2' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleForfeit(t.id, t.name)}
                  className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 bg-rose-500/5 px-4 py-4 rounded-2xl hover:bg-rose-500/10 transition"
                >
                  {t.name} Forfeits
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MOM Picker Modal */}
      <Modal open={showMomPicker} onClose={() => setShowMomPicker(false)} title="Select Man of the Match">
        <div className="space-y-8">
          <div className="bg-neon-amber/5 border border-neon-amber/20 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black text-ink-500 uppercase tracking-widest">Recommended</span>
            <span className="text-xs font-black text-neon-amber">{recommendedMom?.name || '...'}</span>
          </div>
          
          {[team1, team2].map(team => team && (
            <div key={team.id} className="space-y-3">
              <h4 className="text-[10px] font-black text-ink-600 uppercase tracking-[.25em] ml-1">{team.name}</h4>
              <div className="grid grid-cols-2 gap-2">
                {(team.players || []).map(p => (
                  <button
                    key={p.id}
                    onClick={() => pickMom(p.id)}
                    disabled={submitting}
                    className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${p.id === currentMomId ? 'bg-neon-amber text-ink-950 shadow-glow-amber' : 'bg-white/[.03] border border-white/[.08] text-ink-300 hover:border-white/20 hover:text-white'}`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === recommendedMom?.id && (
                      <Star className={`w-3.5 h-3.5 ${p.id === currentMomId ? 'text-ink-950 fill-current' : 'text-neon-amber fill-current'} shrink-0`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Update Match Meta">
         <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-xs text-ink-500 font-bold uppercase tracking-widest">Advanced control coming soon</p>
            <Button variant="danger" className="mt-6 w-full" onClick={() => navigate(`/tournaments/${match.tournament}`)}>
               Back to Tournament
            </Button>
         </div>
      </Modal>
    </div>
  )
}
