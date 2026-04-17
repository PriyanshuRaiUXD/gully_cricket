const statusMap: Record<string, { label: string; className: string }> = {
  SETUP: { label: 'Setup', className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  POOL_STAGE: { label: 'Pool Stage', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  KNOCKOUTS: { label: 'Knockouts', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  COMPLETED: { label: 'Finished', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  SCHEDULED: { label: 'Upcoming', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  TOSS: { label: 'Toss', className: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  IN_PROGRESS: { label: '● Live', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse' },
  INNINGS_BREAK: { label: 'Break', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  FORFEITED: { label: 'Forfeited', className: 'bg-rose-900/30 text-rose-400 border-rose-900/50' },
  ABANDONED: { label: 'Abandoned', className: 'bg-slate-800/50 text-slate-400 border-slate-700/50' },
}

export function Badge({ status, className = '' }: { status: string; className?: string }) {
  const s = statusMap[status] || { 
    label: status.replace(/_/g, ' '), 
    className: 'bg-white/5 text-ink-400 border-white/10' 
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.className} ${className}`}>
      {s.label}
    </span>
  )
}
