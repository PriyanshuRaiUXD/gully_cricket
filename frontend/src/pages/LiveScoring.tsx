import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import type { Match, Team, Player, Innings, Ball } from '../types'
import { 
  ArrowLeft, RotateCcw, Zap, Users, Target, 
  ShieldCheck, Star, ChevronDown, Trophy, 
  Activity, CircleDot, Clock, UserMinus, UserCheck, Download,
  Layout, LogOut, Coffee, History, X, Undo2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLoader } from '../components/ui/Spinner'

interface ScoringState {
  match: Match
  teams: Team[]
  currentInnings: Innings | null
  balls: Ball[]
  target: number | null
}

function ballDisplay(b: Ball) {
  if (b.is_wicket) return 'W'
  if (b.is_wide) return `Wd${b.extra_runs > 0 ? '+' + b.extra_runs : ''}`
  if (b.is_noball) return `Nb${b.runs_scored > 0 ? '+' + b.runs_scored : ''}`
  if (b.runs_scored === 0) return '·'
  return String(b.runs_scored)
}

function ballColor(b: Ball) {
  if (b.is_wicket) return 'bg-rose-600 text-white'
  if (b.runs_scored === 6) return 'bg-purple-600 text-white shadow-glow-purple/20'
  if (b.runs_scored === 4) return 'bg-emerald-600 text-white shadow-glow-emerald/20'
  if (b.is_wide || b.is_noball) return 'bg-amber-600 text-ink-950'
  return 'bg-white/10 text-ink-300'
}

export default function LiveScoring() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [state, setState] = useState<ScoringState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Console States
  const [striker, setStriker] = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowler, setBowler] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  
  // Wicket Logic
  const [showWicket, setShowWicket] = useState(false)
  const [wicketType, setWicketType] = useState('BOWLED')
  const [dismissedPlayer, setDismissedPlayer] = useState('')
  const [fielder, setFielder] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      // 1. Fetch match and scorecard first
      const [mRes, scRes] = await Promise.all([
        api.get(`/matches/${id}/`),
        api.get(`/matches/${id}/scorecard/`),
      ])
      
      const match = mRes.data
      const scData = scRes.data

      if (!match?.tournament) {
        throw new Error('Tournament reference missing');
      }

      // 2. Fetch teams using the tournament ID from match
      const tRes = await api.get(`/tournaments/${match.tournament}/teams/`)
      const rawTeams = tRes.data.results || tRes.data
      const teams = Array.isArray(rawTeams) ? rawTeams : []
      
      const currentInnings = match.innings?.find((i: Innings) => !i.is_completed) 
        || match.innings?.[match.innings.length - 1] 
        || null
      
      const balls = currentInnings 
        ? (scData.innings?.find((si: any) => si.innings.id === currentInnings.id)?.balls || [])
        : []

      const inn1 = match.innings?.find((i: Innings) => i.innings_number === 1)
      const target = (currentInnings?.innings_number === 2 && inn1) ? inn1.total_runs + 1 : null

      setState({ match, teams, currentInnings, balls, target })
    } catch (err: any) {
      console.error('Sync Error:', err)
      toast.error(`Sync Failed: ${err.message || 'Check connection'}`)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // Derived Match Intelligence
  const outPlayerIds = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(state.balls.filter(b => b.is_wicket).map(b => b.dismissed_player).filter(Boolean) as string[])
  }, [state])

  const bowlerStats = useMemo(() => {
    if (!state) return {}
    const stats: Record<string, { runs: number, wickets: number, balls: number, oversText: string }> = {}
    state.balls.forEach(b => {
      if (!stats[b.bowler]) stats[b.bowler] = { runs: 0, wickets: 0, balls: 0, oversText: '0.0' }
      const s = stats[b.bowler]
      s.runs += (b.runs_scored + b.extra_runs)
      if (b.is_wicket && !['RUN_OUT', 'RETIRED_HURT'].includes(b.wicket_type || '')) s.wickets++
      if (!b.is_wide && !b.is_noball) s.balls++
      s.oversText = `${Math.floor(s.balls / 6)}.${s.balls % 6}`
    })
    return stats
  }, [state])

  // ─── Actions ───

  const downloadLogs = () => {
    if (!state) return
    const headers = ['Over', 'Ball', 'Bowler', 'Striker', 'Runs', 'Extra', 'Type', 'Wicket', 'Dismissed']
    const allPlayers = Array.isArray(state.teams) ? state.teams.flatMap(t => t.players || []) : []
    const rows = state.balls.map(b => [
      b.over_number,
      b.ball_number,
      allPlayers.find(p => p.id === b.bowler)?.name || b.bowler,
      allPlayers.find(p => p.id === b.striker)?.name || b.striker,
      b.runs_scored,
      b.extra_runs,
      b.is_wide ? 'Wide' : b.is_noball ? 'No Ball' : 'Legal',
      b.is_wicket ? b.wicket_type : 'No',
      b.dismissed_player ? allPlayers.find(p => p.id === b.dismissed_player)?.name : ''
    ])
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `match_${state.match.match_number}_logs.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const revertToBall = async (ballId: string) => {
    if(!confirm("Revert match to this point? All balls after this will be deleted.")) return;
    try {
      await api.post(`/matches/${id}/revert-ball/`, { ball_id: ballId });
      toast.success("Match rewound");
      loadData();
    } catch {
      toast.error("Revert failed");
    }
  }

  async function recordBall(runs: number, extras?: { is_wide?: boolean; is_noball?: boolean }) {
    if (!striker || !nonStriker || !bowler) {
      toast.error('Complete Crease Setup first')
      return
    }
    setSubmitting(true)
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
      })
      
      let nextS = striker; let nextNS = nonStriker;
      if (runs % 2 !== 0) [nextS, nextNS] = [nextNS, nextS];

      const currentBalls = (state?.balls || []).filter(b => b.over_number === Math.floor(Number(state?.currentInnings?.total_overs || 0)) && !b.is_wide && !b.is_noball).length;
      if ((currentBalls + (extras?.is_wide || extras?.is_noball ? 0 : 1)) === 6) {
        [nextS, nextNS] = [nextNS, nextS];
        setBowler('');
        toast.success('Over Complete!');
      }

      setStriker(nextS); setNonStriker(nextNS);
      await loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record ball')
    } finally {
      setSubmitting(false)
    }
  }

  async function recordWicket() {
    if (!striker || !nonStriker || !bowler || !dismissedPlayer) {
      toast.error('Details missing')
      return
    }
    
    const needsFielder = ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketType)
    if (needsFielder && !fielder) {
      toast.error('Select a fielder')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/matches/${id}/ball/`, {
        runs_scored: 0, is_wide: false, is_noball: false, is_wicket: true,
        wicket_type: wicketType, extra_runs: 0, striker_id: striker,
        non_striker_id: nonStriker, bowler_id: bowler,
        fielder_id: needsFielder ? fielder : null,
        dismissed_player_id: dismissedPlayer,
      })

      if (dismissedPlayer === striker) setStriker('')
      else if (dismissedPlayer === nonStriker) setNonStriker('')

      setShowWicket(false); setDismissedPlayer(''); setFielder('');
      toast.success('Wicket Logged')
      await loadData()
    } catch (err: any) {
      toast.error('Failed to record wicket')
    } finally {
      setSubmitting(false)
    }
  }

  const swapStrike = () => {
    const s = striker; setStriker(nonStriker); setNonStriker(s);
  };

  // Drag & Drop Handlers
  const onDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  }

  const onDrop = (e: React.DragEvent, pos: 'striker' | 'nonStriker' | 'bowler') => {
    e.preventDefault();
    const pid = e.dataTransfer.getData("playerId");
    if (pos === 'striker') {
       if (pid === nonStriker) setNonStriker('');
       setStriker(pid);
    } else if (pos === 'nonStriker') {
       if (pid === striker) setStriker('');
       setNonStriker(pid);
    } else {
       setBowler(pid);
    }
  }

  if (loading) return <PageLoader />

  if (!state) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="glass p-10 rounded-[3rem] border border-rose-500/20 max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
               <Zap className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black uppercase text-white mb-2">Terminal Offline</h2>
            <p className="text-ink-500 text-sm mb-8">Failed to synchronize match protocol. Please check your network or return to the tournament page.</p>
            <button 
              onClick={() => navigate(-1)} 
              className="w-full h-14 rounded-2xl bg-white text-ink-950 font-black uppercase tracking-widest text-xs shadow-glow-white/10"
            >
               Abort & Return
            </button>
         </div>
      </div>
    )
  }

  const { match, teams, currentInnings, balls, target } = state
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const battingTeam = currentInnings ? teamMap[currentInnings.batting_team] : null
  const bowlingTeam = currentInnings ? teamMap[currentInnings.bowling_team] : null
  
  const battingPlayers = battingTeam?.players || []
  const bowlingPlayers = bowlingTeam?.players || []

  // Player Categorization
  const availableBatters = battingPlayers.filter(p => !outPlayerIds.has(p.id) && p.id !== striker && p.id !== nonStriker)
  const outBatters = battingPlayers.filter(p => outPlayerIds.has(p.id))

  const currentOverNum = Math.floor(Number(currentInnings?.total_overs || 0))
  const currentOverBalls = balls.filter(b => b.over_number === currentOverNum)

  return (
    <div className="h-screen w-screen bg-ink-950 text-white flex flex-col overflow-hidden select-none font-display relative">
      
      {/* 1. HEADER */}
      <header className="h-16 flex-shrink-0 bg-ink-900 border-b border-white/5 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(`/matches/${id}`)} className="p-2 -ml-2 text-ink-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div className="flex items-center gap-4">
              <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                 <p className="text-[10px] text-ink-500 font-black uppercase tracking-widest">{battingTeam?.name} batting</p>
                 <p className="text-xl font-black text-neon-cyan leading-none">{currentInnings?.total_runs}<span className="text-ink-500 text-sm">/{currentInnings?.total_wickets}</span></p>
              </div>
              <div className="text-[10px] text-ink-600 font-bold uppercase tracking-widest leading-relaxed">
                 {currentInnings?.total_overs} Overs Logged<br />
                 {target ? `Target: ${target}` : 'First Innings'}
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowHistory(!showHistory)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${showHistory ? 'bg-neon-cyan text-ink-950 border-neon-cyan' : 'bg-white/5 border-white/5 text-ink-400 hover:text-white'}`}
           >
              <History className="w-3.5 h-3.5" /> {showHistory ? 'Close Timeline' : 'Match Timeline'}
           </button>
           <button onClick={downloadLogs} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-ink-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
              <Download className="w-3.5 h-3.5" /> Export Logs
           </button>
           <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Terminal</span>
           </div>
        </div>
      </header>

      {/* 2. CONSOLE */}
      <main className="flex-1 flex min-h-0 bg-black/20 relative">
         
         {/* LEFT: SQUAD MANAGER */}
         <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
            
            {/* Batting Flow */}
            <div className="flex-[3] flex flex-col min-h-0 p-4 space-y-4">
               
               {/* Droppable Crease */}
               <div className="grid grid-cols-2 gap-4">
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, 'striker')}
                    onClick={() => setStriker('')}
                    className={`h-24 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${striker ? 'bg-neon-cyan text-ink-950 border-neon-cyan shadow-glow-cyan' : 'bg-white/[.02] border-white/10 border-dashed text-ink-600'}`}
                  >
                     <p className="text-[9px] font-black uppercase tracking-[.2em]">{striker ? 'Striker' : 'Drop Striker Here'}</p>
                     <p className="text-sm font-black uppercase">{battingPlayers.find(p => p.id === striker)?.name || 'Empty'}</p>
                     {striker && <UserCheck className="w-4 h-4 mt-1 opacity-50" />}
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, 'nonStriker')}
                    onClick={() => setNonStriker('')}
                    className={`h-24 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${nonStriker ? 'bg-white/10 text-white border-white/40 shadow-xl' : 'bg-white/[.02] border-white/10 border-dashed text-ink-600'}`}
                  >
                     <p className="text-[9px] font-black uppercase tracking-[.2em]">{nonStriker ? 'Non-Striker' : 'Drop Non-Striker Here'}</p>
                     <p className="text-sm font-black uppercase">{battingPlayers.find(p => p.id === nonStriker)?.name || 'Empty'}</p>
                     {nonStriker && <Users className="w-4 h-4 mt-1 opacity-50" />}
                  </div>
               </div>

               {/* Dugout & Pavilion */}
               <div className="flex-1 flex gap-4 min-h-0">
                  {/* Dugout: Available */}
                  <div className="flex-[2] flex flex-col min-h-0">
                     <h3 className="text-[10px] font-black text-ink-500 uppercase tracking-[.25em] mb-3 flex items-center gap-2 ml-2">
                        <Layout className="w-3 h-3" /> The Dugout
                     </h3>
                     <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-2 pr-2 custom-scrollbar">
                        {availableBatters.map(p => (
                          <div 
                            key={p.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, p.id)}
                            className="h-12 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all p-3 flex items-center justify-between cursor-grab active:cursor-grabbing group"
                          >
                             <span className="text-[10px] font-black uppercase truncate">{p.name}</span>
                             <Users className="w-3 h-3 text-ink-700 group-hover:text-white" />
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Pavilion: Out */}
                  <div className="flex-1 flex flex-col min-h-0 border-l border-white/5 pl-4">
                     <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[.25em] mb-3 flex items-center gap-2">
                        <LogOut className="w-3 h-3" /> Pavilion
                     </h3>
                     <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {outBatters.map(p => (
                          <div key={p.id} className="h-10 rounded-xl bg-rose-500/5 border border-rose-500/20 px-3 flex items-center gap-2 opacity-60">
                             <UserMinus className="w-3 h-3 text-rose-500" />
                             <span className="text-[9px] font-bold uppercase text-rose-300 line-through">{p.name}</span>
                          </div>
                        ))}
                        {outBatters.length === 0 && <p className="text-[9px] text-ink-800 font-bold uppercase text-center mt-8 italic">No wickets yet</p>}
                     </div>
                  </div>
               </div>
            </div>

            {/* Bowling Attack */}
            <div className="flex-[2] border-t border-white/5 p-4 flex flex-col min-h-0 bg-ink-900/10">
               <div className="flex justify-between items-center mb-3 ml-2">
                  <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[.25em] flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Active Attack
                  </h3>
                  {bowler && <button onClick={() => setBowler('')} className="text-[9px] font-bold text-ink-600 hover:text-white uppercase tracking-widest transition-colors">Clear Bowler</button>}
               </div>
               <div 
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => onDrop(e, 'bowler')}
                 className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-4 gap-2 pr-2 custom-scrollbar"
               >
                  {bowlingPlayers.map(p => {
                    const s = bowlerStats[p.id] || { oversText: '0.0', wickets: 0, runs: 0 }
                    const isActive = bowler === p.id
                    return (
                      <div 
                        key={p.id} 
                        draggable
                        onDragStart={(e) => onDragStart(e, p.id)}
                        onClick={() => setBowler(isActive ? '' : p.id)}
                        className={`h-16 rounded-2xl border-2 transition-all p-3 flex flex-col justify-between cursor-pointer ${
                          isActive ? 'bg-rose-600 text-white border-rose-400 shadow-glow-rose' :
                          'bg-white/5 text-ink-500 border-white/5 hover:border-white/10'
                        }`}
                      >
                         <p className="text-[10px] font-black uppercase truncate leading-none">{p.name}</p>
                         <div className="flex justify-between items-end opacity-70">
                            <span className="text-[9px] font-mono font-bold">{s.oversText} Ov</span>
                            <span className="text-[10px] font-black">{s.wickets}/{s.runs}</span>
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>
         </div>

         {/* RIGHT: SCORING PAD */}
         <div className="w-[360px] lg:w-[500px] flex flex-col bg-ink-900/60 p-4 space-y-4">
            
            {/* OVER LOG */}
            <div className="glass rounded-[2rem] p-6 border border-white/5 shadow-inner">
               <div className="flex justify-between items-baseline mb-4">
                  <p className="text-[10px] text-ink-600 font-black uppercase tracking-[.25em]">Session Progression</p>
                  <button onClick={swapStrike} className="text-[9px] text-neon-cyan font-black uppercase tracking-widest flex items-center gap-1.5 hover:text-white transition-colors">
                     <RotateCcw className="w-3 h-3" /> Swap Strike
                  </button>
               </div>
               <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-hide">
                  {currentOverBalls.length === 0 && (
                    <div className="flex items-center gap-3 py-2 text-ink-700 animate-pulse">
                       <Coffee className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">New Over protocol starting...</span>
                    </div>
                  )}
                  {currentOverBalls.map((b, i) => (
                    <div key={i} className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-xs font-black border border-white/5 shadow-lg ${ballColor(b)}`}>
                       {ballDisplay(b)}
                    </div>
                  ))}
               </div>
            </div>

            {/* ACTION PAD */}
            <div className="flex-1 flex flex-col gap-4">
               <div className="flex-1 grid grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 6].map(r => (
                    <button
                      key={r}
                      disabled={submitting || !bowler || !striker}
                      onClick={() => recordBall(r)}
                      className={`rounded-[2.5rem] border-2 transition-all active:scale-90 flex flex-col items-center justify-center gap-1 disabled:opacity-10 ${
                        r === 6 ? 'bg-purple-600/10 border-purple-500/40 text-purple-400' :
                        r === 4 ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400' :
                        'bg-white/5 border-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                       <span className="text-5xl font-black">{r}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{r === 0 ? 'Dot' : r === 1 ? 'Single' : 'Runs'}</span>
                    </button>
                  ))}
               </div>

               <div className="grid grid-cols-2 gap-4 h-24">
                  <button onClick={() => recordBall(0, { is_wide: true })} disabled={submitting || !bowler} className="rounded-[1.5rem] bg-amber-500/10 border-2 border-amber-500/20 text-amber-500 font-black uppercase tracking-widest text-[11px] hover:bg-amber-500/20 transition-all">WIDE (+1)</button>
                  <button onClick={() => recordBall(0, { is_noball: true })} disabled={submitting || !bowler} className="rounded-[1.5rem] bg-amber-500/10 border-2 border-amber-500/20 text-amber-500 font-black uppercase tracking-widest text-[11px] hover:bg-amber-500/20 transition-all">NO BALL (+1)</button>
               </div>

               <button 
                 onClick={() => { setDismissedPlayer(striker); setShowWicket(true) }} 
                 disabled={submitting || !bowler || !striker}
                 className="h-24 rounded-[3rem] bg-rose-600 border-2 border-rose-400 text-white font-black uppercase tracking-[.4em] text-xl shadow-glow-rose/40 active:scale-95 transition-all flex items-center justify-center gap-4"
               >
                 <UserMinus className="w-6 h-6 fill-current" /> DISMISSAL
               </button>
            </div>
         </div>

         {/* ─── TIMELINE SIDEBAR (Animated) ─── */}
         <div className={`absolute top-0 right-0 h-full w-[360px] bg-ink-900 border-l border-white/10 shadow-2xl transition-transform duration-500 z-50 flex flex-col ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
               <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-neon-cyan" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Match History</h3>
               </div>
               <button onClick={() => setShowHistory(false)} className="p-2 text-ink-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {balls.slice().reverse().map((b, i) => (
                 <div key={b.id} className="glass p-4 rounded-2xl border border-white/5 group hover:border-neon-cyan/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-ink-500 uppercase tracking-widest">Over {b.over_number}.{b.ball_number || 'X'}</span>
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${ballColor(b)}`}>
                          {ballDisplay(b)}
                       </div>
                    </div>
                    <div className="text-[11px] text-white font-bold uppercase tracking-tight">
                       {Array.isArray(state.teams) ? state.teams.flatMap(t => t.players || []).find(p => p.id === b.bowler)?.name : 'Unknown Bowler'} → {Array.isArray(state.teams) ? state.teams.flatMap(t => t.players || []).find(p => p.id === b.striker)?.name : 'Unknown Striker'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[.04] flex justify-between items-center">
                       <button 
                         onClick={() => revertToBall(b.id)}
                         className="flex items-center gap-1.5 text-[9px] font-black text-neon-cyan uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                       >
                          <Undo2 className="w-3 h-3" /> Revert to this point
                       </button>
                       {b.is_wicket && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Wicket Logged</span>}
                    </div>
                 </div>
               ))}
               {balls.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                    <History className="w-12 h-12 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">No protocol records found for this session</p>
                 </div>
               )}
            </div>
         </div>
      </main>

      {/* 3. DISMISSAL OVERLAY */}
      {showWicket && (
        <div className="absolute inset-0 z-[100] bg-ink-950/98 backdrop-blur-2xl flex items-center justify-center p-6">
           <div className="max-w-2xl w-full space-y-12 animate-rise">
              <div className="text-center">
                 <div className="w-20 h-20 rounded-full bg-rose-600/10 border border-rose-600/20 flex items-center justify-center mx-auto mb-6 shadow-glow-rose/10">
                    <UserMinus className="w-10 h-10 text-rose-500" />
                 </div>
                 <h2 className="text-3xl font-black uppercase tracking-[.2em] text-white">Record Wicket</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-ink-500 uppercase tracking-widest block border-b border-white/5 pb-2">Identify Victim</label>
                    <div className="grid grid-cols-1 gap-3">
                       {[{id: striker, label: 'Current Striker'}, {id: nonStriker, label: 'Non-Striker'}].map(p => {
                         const name = battingPlayers.find(bp => bp.id === p.id)?.name
                         if(!p.id) return null
                         return (
                          <button key={p.id} onClick={() => setDismissedPlayer(p.id)} className={`h-20 rounded-3xl border-2 font-black uppercase text-sm transition-all text-left px-6 relative overflow-hidden group ${dismissedPlayer === p.id ? 'bg-rose-600 border-rose-400 text-white' : 'bg-white/5 border-white/5 text-ink-500'}`}>
                             {name} <span className="block text-[9px] opacity-60 tracking-widest mt-1">{p.label}</span>
                             <UserMinus className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 opacity-5" />
                          </button>
                        )
                       })}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-ink-500 uppercase tracking-widest block border-b border-white/5 pb-2">Dismissal Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['BOWLED', 'CAUGHT', 'RUN_OUT', 'LBW', 'STUMPED', 'HIT_WICKET'].map(t => (
                         <button key={t} onClick={() => setWicketType(t)} className={`h-14 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${wicketType === t ? 'bg-white text-ink-950 shadow-glow-white' : 'bg-white/5 border-white/5 text-ink-600 hover:text-white'}`}>
                            {t.replace('_', ' ')}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketType) && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                   <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block ml-2">Assisting Fielder Required</label>
                   <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                      {bowlingPlayers.map(p => (
                        <button key={p.id} onClick={() => setFielder(p.id)} className={`h-14 px-8 rounded-2xl border-2 shrink-0 font-black uppercase text-[11px] tracking-widest transition-all ${fielder === p.id ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/5 text-ink-500'}`}>
                           {p.name}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <div className="flex gap-6 pt-8 border-t border-white/5">
                 <button onClick={() => setShowWicket(false)} className="flex-1 h-16 rounded-3xl bg-white/5 text-ink-500 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">Abort Action</button>
                 <button onClick={recordWicket} className="flex-[2] h-16 rounded-3xl bg-rose-600 text-white font-black uppercase tracking-widest text-xs shadow-glow-rose/30 hover:bg-rose-500 active:scale-95 transition-all">Confirm Dismissal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
