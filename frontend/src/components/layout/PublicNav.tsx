import { Link } from "react-router-dom";
import { Radio as RadioIcon, Trophy as TrophyIcon } from "lucide-react";

interface PublicNavProps {
  liveCount?: number;
}

export function PublicNav({ liveCount = 0 }: PublicNavProps) {
  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-white/[.06]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group"
          aria-label="Gully Cricket home"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
            <TrophyIcon className="w-4.5 h-4.5 text-ink-900" strokeWidth={2.5} />
            <span className="absolute -inset-[1px] rounded-xl opacity-60 mix-blend-overlay pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.6),transparent_55%)]" />
          </div>
          <div className="leading-none">
            <p className="font-display font-bold text-[15px] tracking-tight text-white group-hover:text-neon-cyan transition">
              Gully Cricket
            </p>
            <p className="text-[10px] text-ink-500 uppercase tracking-[.18em] mt-1">
              Live Tournament
            </p>
          </div>
        </Link>

        {/* Centre — live indicator */}
        {liveCount > 0 && (
          <Link
            to="/#live-section"
            className="hidden sm:flex items-center gap-2.5 rounded-full px-4 py-1.5 bg-live/10 border border-live/30 hover:bg-live/15 transition"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
            </span>
            <span className="text-[11px] font-bold text-live tracking-[.18em] uppercase font-display">
              {liveCount} Live {liveCount === 1 ? "Match" : "Matches"}
            </span>
          </Link>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white hover:text-neon-cyan transition px-2 py-1"
          >
            <RadioIcon className="w-3.5 h-3.5" />
            Login
          </Link>
          <Link
            to="/register"
            className="hidden md:flex items-center gap-2 bg-white text-ink-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-cyan transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
