import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import type { Tournament } from '../types'
import { Navbar } from '../components/layout/Navbar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/Spinner'
import { 
  Trophy, Plus, Users, Clock, CheckCircle2, Activity, 
  PlayCircle, Calendar, Shield, ArrowRight, 
  Filter, Sparkles, Zap, Target, Layers, Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_SORT: Record<string, number> = { SETUP: 0, POOL_STAGE: 1, KNOCKOUTS: 2, COMPLETED: 3 }

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', overs: 6, total_teams: 8, players_per_team: 11, pool_count: 2,
  })

  useEffect(() => {
    fetchTournaments()
  }, [])

  function fetchTournaments() {
    api.get('/tournaments/')
      .then((res) => setTournaments(res.data.results || res.data))
      .catch(() => toast.error('Failed to load tournaments'))
      .finally(() => setLoading(false))
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: name === 'name' ? value : Number(value) }))
  }

  function openCreate() {
    setIsEditing(false)
    setEditingId(null)
    setForm({ name: '', overs: 6, total_teams: 8, players_per_team: 11, pool_count: 2 })
    setStep(1)
    setShowModal(true)
  }

  function openEdit(e: React.MouseEvent, t: Tournament) {
    e.stopPropagation()
    if (t.status === 'COMPLETED') {
      toast.error('Completed tournaments cannot be modified.')
      return
    }
    setIsEditing(true)
    setEditingId(t.id)
    setForm({ 
      name: t.name, 
      overs: t.overs, 
      total_teams: t.total_teams, 
      players_per_team: t.players_per_team, 
      pool_count: t.pool_count 
    })
    setStep(1)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (isEditing && editingId) {
        await api.patch(`/tournaments/${editingId}/`, form)
        toast.success('Tournament updated successfully')
        fetchTournaments()
      } else {
        const res = await api.post('/tournaments/', form)
        toast.success(`"${res.data.name}" created!`)
        navigate(`/tournaments/${res.data.id}`)
      }
      setShowModal(false)
    } catch (err: any) {
      toast.error('Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const active = tournaments.filter((t) => t.status !== 'COMPLETED').length
  const completed = tournaments.filter((t) => t.status === 'COMPLETED').length
  const totalTeams = tournaments.reduce((acc, t) => acc + t.total_teams, 0)
  
  const recentTournament = tournaments.length > 0 
    ? [...tournaments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
    : null;

  const filteredTournaments = useMemo(() => {
    let filtered = tournaments
    if (filter === 'ACTIVE') filtered = tournaments.filter(t => t.status !== 'COMPLETED')
    if (filter === 'COMPLETED') filtered = tournaments.filter(t => t.status === 'COMPLETED')
    return filtered.sort((a, b) => (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9))
  }, [tournaments, filter])

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-neon-cyan/30 flex flex-col relative overflow-hidden">
      <Navbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5 shadow-glow-cyan bg-neon-cyan text-ink-950 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Tournament
          </Button>
        }
      />

      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
      
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-neon-cyan font-bold uppercase tracking-widest mb-4">
              <Shield className="w-3.5 h-3.5" />
              Tournament Organizer
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-3">
              Tournament <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-violet">Management</span>
            </h1>
            <p className="text-ink-400 max-w-xl text-sm md:text-base leading-relaxed font-medium">
              Manage your local cricket tournaments. Register teams, generate matches, and broadcast live scores to everyone.
            </p>
          </div>
          
          {recentTournament && recentTournament.status !== 'COMPLETED' && (
             <div className="glass group p-1 rounded-2xl border border-neon-cyan/20 bg-neon-cyan/5 shadow-glow-cyan/5 hidden lg:block max-w-xs animate-float">
                <div className="px-5 py-4 flex flex-col gap-2">
                   <div className="text-[10px] uppercase font-bold text-neon-cyan tracking-[.2em] flex items-center gap-1.5">
                     <Activity className="w-3 h-3 animate-pulse" /> Active Tournament
                   </div>
                   <div className="font-display font-bold text-white truncate text-sm">{recentTournament.name}</div>
                   <Button size="sm" onClick={() => navigate(`/tournaments/${recentTournament.id}`)} variant="outline" className="w-full text-[11px] h-8 mt-2 gap-1.5 bg-white/5 border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 text-white transition-all">
                     View Progress <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                   </Button>
                </div>
             </div>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total Events', value: tournaments.length, icon: <Trophy className="w-5 h-5 text-ink-400" />, color: 'from-white/5 to-white/0', border: 'hover:border-white/20' },
            { label: 'Live Now', value: active, icon: <Activity className="w-5 h-5 text-neon-cyan" />, color: 'from-neon-cyan/10 to-transparent', border: 'hover:border-neon-cyan/30' },
            { label: 'Registered Teams', value: totalTeams, icon: <Users className="w-5 h-5 text-neon-violet" />, color: 'from-neon-violet/10 to-transparent', border: 'hover:border-neon-violet/30' },
            { label: 'Finished', value: completed, icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, color: 'from-emerald-500/10 to-transparent', border: 'hover:border-emerald-500/30' },
          ].map((s) => (
            <div key={s.label} className={`relative glass rounded-2xl p-5 md:p-6 border border-white/[.04] shadow-panel overflow-hidden group transition-all duration-300 bg-gradient-to-br ${s.color} ${s.border}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-ink-900 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-black font-display tracking-tight text-white mb-1">{s.value}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-[.15em] font-bold">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* View Control */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8 border-b border-white/5 pb-8">
           <div className="flex bg-ink-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md w-full sm:w-auto">
             {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black tracking-[.2em] uppercase transition-all ${
                    filter === f 
                      ? 'bg-white/10 text-neon-cyan shadow-glow-cyan/10' 
                      : 'text-ink-500 hover:text-ink-300'
                  }`}
                >
                  {f}
                </button>
             ))}
           </div>
           
           <div className="text-[11px] font-medium text-ink-500 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
             Live Sync Enabled
           </div>
        </div>

        {/* Content */}
        {tournaments.length === 0 ? (
          <div className="relative overflow-hidden glass rounded-[3rem] border border-white/[.06] p-12 md:p-24 text-center shadow-panel animate-rise mt-8">
            <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-10" />
            <div className="relative z-10 max-w-md mx-auto">
              <div className="inline-flex w-24 h-24 rounded-3xl bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 items-center justify-center border border-white/10 mb-10 shadow-glow-cyan/20 rotate-3">
                <Trophy className="w-12 h-12 text-neon-cyan" strokeWidth={1.2} />
              </div>
              <h3 className="text-3xl font-display font-black text-white tracking-tight mb-4">No Tournaments Yet</h3>
              <p className="text-ink-400 text-sm md:text-base mb-10 leading-relaxed font-medium">
                Ready to organize? Create your first tournament to start managing teams and matches.
              </p>
              <Button onClick={openCreate} size="lg" className="w-full sm:w-auto px-10 h-14 rounded-2xl bg-neon-cyan text-ink-950 hover:bg-cyan-400 shadow-glow-cyan font-black uppercase tracking-widest text-xs">
                <Zap className="w-5 h-5 mr-2 fill-current" /> Create Tournament
              </Button>
            </div>
          </div>
        ) : filteredTournaments.length === 0 ? (
           <div className="py-24 text-center glass rounded-3xl border border-white/5 border-dashed">
              <Filter className="w-12 h-12 text-ink-700 mx-auto mb-4" />
              <p className="text-ink-500 font-bold uppercase tracking-widest text-xs">No tournaments found</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTournaments.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                className="group relative flex flex-col glass rounded-3xl border border-white/[.06] p-7 text-left hover:border-neon-cyan/30 hover:bg-white/[.02] transition-all duration-500 overflow-hidden shadow-panel hover:shadow-panel-hover cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative flex justify-between items-start mb-6 z-20">
                  <Badge status={t.status} />
                  <div className="flex gap-2 relative">
                    <div 
                      onClick={(e) => openEdit(e, t)}
                      className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-neon-cyan hover:text-ink-950 hover:border-neon-cyan transition-all cursor-pointer shadow-lg z-30"
                      title="Edit Tournament"
                    >
                        <Edit3 className="w-5 h-5" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink-500 group-hover:text-neon-cyan group-hover:border-neon-cyan/30 transition-all shadow-lg">
                       <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </div>
                  </div>
                </div>

                <h3 className="relative font-display font-black text-xl text-white group-hover:text-neon-cyan transition-colors leading-tight line-clamp-2 mb-3 uppercase">
                  {t.name}
                </h3>
                
                <div className="flex items-center gap-3 text-[10px] text-ink-500 font-bold uppercase tracking-wider mb-8">
                   <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 2026 Season</div>
                   <div className="w-1 h-1 rounded-full bg-ink-800" />
                   <div>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                </div>

                <div className="relative mt-auto grid grid-cols-3 gap-4 border-t border-white/[.04] pt-6">
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-ink-600 tracking-[.15em]">TEAMS</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-neon-cyan/60" /> {t.total_teams}</span>
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-ink-600 tracking-[.15em]">OVERS</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-neon-cyan/60" /> {t.overs}</span>
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-ink-600 tracking-[.15em]">POOLS</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-neon-cyan/60" /> {t.pool_count}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* STEP-BASED FORM */}
      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title={isEditing ? `Edit Tournament: ${form.name}` : (step === 1 ? "New Tournament" : "Match Rules")} 
        size="md"
      >
        <div className="mb-8">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-[.2em] text-neon-cyan">{isEditing ? "Modify Configuration" : "Tournament Setup"}</span>
              {!isEditing && <span className="text-[10px] font-bold text-ink-500">{step}/2</span>}
           </div>
           <div className="h-1 bg-ink-900 rounded-full overflow-hidden flex gap-1">
              <div className={`h-full transition-all duration-500 rounded-full ${step >= 1 ? 'flex-1 bg-neon-cyan shadow-glow-cyan' : 'flex-0 bg-transparent'}`} />
              <div className={`h-full transition-all duration-500 rounded-full ${step >= 2 || isEditing ? 'flex-1 bg-neon-cyan shadow-glow-cyan' : 'flex-1 bg-ink-800'}`} />
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {(step === 1 || isEditing) && (
            <div className={`space-y-6 ${!isEditing ? 'animate-in fade-in slide-in-from-right-4 duration-300' : ''}`}>
              <div className="space-y-3">
                <label className="block text-[11px] uppercase tracking-[.25em] font-black text-ink-400 ml-1">Tournament Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Sparkles className="h-4 w-4 text-neon-cyan group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Winter Premier League"
                    autoFocus
                    className="w-full bg-ink-900 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 placeholder:text-ink-700 transition-all font-bold uppercase"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                      <Clock className="w-3.5 h-3.5 text-neon-cyan" /> Match Overs
                    </label>
                    <select
                      name="overs"
                      value={form.overs}
                      onChange={handleFormChange}
                      className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                    >
                      {[2, 4, 6, 8, 10, 12, 15, 20].map(o => (
                        <option key={o} value={o} className="bg-ink-950">{o} Overs</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                      <Target className="w-3.5 h-3.5 text-neon-cyan" /> Players Per Team
                    </label>
                    <select
                      name="players_per_team"
                      value={form.players_per_team}
                      onChange={handleFormChange}
                      className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                    >
                      {[5, 6, 7, 8, 9, 10, 11].map(p => (
                        <option key={p} value={p} className="bg-ink-950">{p} Players</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                      <Users className="h-3.5 w-3.5 text-neon-cyan" /> Total Teams
                    </label>
                    <select
                      name="total_teams"
                      value={form.total_teams}
                      onChange={handleFormChange}
                      className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                    >
                      {[4, 6, 8, 10, 12, 16, 24, 32].map(t => (
                        <option key={t} value={t} className="bg-ink-950">{t} Teams</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                      <Layers className="h-3.5 w-3.5 text-neon-cyan" /> Groups/Pools
                    </label>
                    <select
                      name="pool_count"
                      value={form.pool_count}
                      onChange={handleFormChange}
                      className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                    >
                      <option value={1} className="bg-ink-950">Round Robin (1 Pool)</option>
                      <option value={2} className="bg-ink-950">2 Groups</option>
                      <option value={4} className="bg-ink-950">4 Groups</option>
                    </select>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="bg-neon-cyan/5 border border-neon-cyan/10 rounded-2xl p-5 flex items-start gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex-shrink-0 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                      <h4 className="text-xs font-bold text-white mb-1">Automatic Scheduling</h4>
                      <p className="text-[10px] text-ink-400 leading-relaxed font-bold">
                        The system will automatically generate all group stage matches and track standings live.
                      </p>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <Button 
                  type="button" 
                  onClick={() => form.name ? setStep(2) : toast.error('Please name your tournament')}
                  className="w-full h-14 rounded-2xl bg-white text-ink-950 hover:bg-ink-100 font-black uppercase tracking-[.2em] text-xs transition-transform active:scale-95"
                >
                  Match Rules <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 h-12 rounded-2xl border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    loading={submitting} 
                    className="flex-[2] h-12 rounded-2xl bg-neon-cyan text-ink-950 hover:bg-cyan-400 shadow-glow-cyan text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Update Tournament
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && !isEditing && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                    <Clock className="w-3.5 h-3.5 text-neon-cyan" /> Match Overs
                  </label>
                  <select
                    name="overs"
                    value={form.overs}
                    onChange={handleFormChange}
                    className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                  >
                    {[2, 4, 6, 8, 10, 12, 15, 20].map(o => (
                      <option key={o} value={o} className="bg-ink-950">{o} Overs</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                    <Target className="w-3.5 h-3.5 text-neon-cyan" /> Players Per Team
                  </label>
                  <select
                    name="players_per_team"
                    value={form.players_per_team}
                    onChange={handleFormChange}
                    className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                  >
                    {[5, 6, 7, 8, 9, 10, 11].map(p => (
                      <option key={p} value={p} className="bg-ink-950">{p} Players</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                    <Users className="h-3.5 w-3.5 text-neon-cyan" /> Total Teams
                  </label>
                  <select
                    name="total_teams"
                    value={form.total_teams}
                    onChange={handleFormChange}
                    className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                  >
                    {[4, 6, 8, 10, 12, 16, 24, 32].map(t => (
                      <option key={t} value={t} className="bg-ink-950">{t} Teams</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] font-black text-ink-400 ml-1">
                    <Layers className="h-3.5 w-3.5 text-neon-cyan" /> Groups/Pools
                  </label>
                  <select
                    name="pool_count"
                    value={form.pool_count}
                    onChange={handleFormChange}
                    className="w-full bg-ink-900 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-all font-bold appearance-none"
                  >
                    <option value={1} className="bg-ink-950">Round Robin (1 Pool)</option>
                    <option value={2} className="bg-ink-950">2 Groups</option>
                    <option value={4} className="bg-ink-950">4 Groups</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="flex-1 h-12 rounded-2xl border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  loading={submitting} 
                  className="flex-[2] h-12 rounded-2xl bg-neon-cyan text-ink-950 hover:bg-cyan-400 shadow-glow-cyan text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Create Tournament
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
