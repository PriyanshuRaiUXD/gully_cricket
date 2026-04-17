import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'amber'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-neon-cyan text-ink-950 hover:bg-white border-transparent focus:ring-neon-cyan/60 shadow-glow-cyan',
  secondary:
    'bg-white/[.06] text-ink-100 hover:bg-white/[.10] border border-white/[.08] focus:ring-white/30',
  danger:
    'bg-live text-white hover:bg-live-glow border-transparent focus:ring-live/60 shadow-glow-live',
  ghost:
    'text-ink-300 hover:bg-white/[.05] hover:text-white border-transparent focus:ring-white/20',
  outline:
    'bg-transparent text-ink-100 hover:bg-white/[.04] border border-white/[.12] hover:border-white/[.22] focus:ring-neon-cyan/40',
  amber:
    'bg-neon-amber text-ink-950 hover:bg-neon-amberDim border-transparent focus:ring-neon-amber/60 shadow-glow-amber',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5 uppercase tracking-wider',
  md: 'px-4 py-2 text-xs gap-2 uppercase tracking-wider',
  lg: 'px-6 py-2.5 text-xs gap-2 uppercase tracking-wider',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-bold transition-all
        focus:outline-none focus:ring-2 focus:ring-offset-0
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </>
      ) : children}
    </button>
  )
}
