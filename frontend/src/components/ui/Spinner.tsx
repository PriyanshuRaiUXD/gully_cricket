export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-neon-cyan ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
           <Spinner className="h-10 w-10" />
           <div className="absolute -inset-4 bg-neon-cyan/20 blur-xl rounded-full animate-pulse" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[.3em] text-ink-500 animate-pulse">Syncing Console Data...</p>
      </div>
    </div>
  )
}
