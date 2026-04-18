import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LogOut, ChevronRight, Trophy } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface NavbarProps {
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}

export function Navbar({ breadcrumbs = [], actions }: NavbarProps) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-white/[.06]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 group shrink-0"
            aria-label="Dashboard"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
              <Trophy className="w-4.5 h-4.5 text-ink-900" strokeWidth={2.5} />
              <span className="absolute -inset-[1px] rounded-xl opacity-60 mix-blend-overlay pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.6),transparent_55%)]" />
            </div>
            <div className="leading-none hidden sm:block">
              <p className="font-display font-bold text-[15px] tracking-tight text-white group-hover:text-neon-cyan transition">
                Gully Cricket
              </p>
              <p className="text-[10px] text-ink-500 uppercase tracking-[.18em] mt-1">
                Admin Panel
              </p>
            </div>
          </Link>

          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 min-w-0 ml-1 pl-3 border-l border-white/[.08]">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ink-600 shrink-0" />}
                  {b.href ? (
                    <Link
                      to={b.href}
                      className="text-xs text-ink-400 hover:text-neon-cyan transition truncate max-w-[140px]"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-white truncate max-w-[160px] sm:max-w-xs">
                      {b.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button
            onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-300 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/[.05] border border-white/[.04] uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
