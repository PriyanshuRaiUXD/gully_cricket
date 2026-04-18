import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import publicApi from "../services/publicApi";
import type { Tournament, Team, Match, Innings } from "../types";
import { PublicNav } from "../components/layout/PublicNav";
import { TeamBadge } from "../components/ui/TeamBadge";
import { teamColor } from "../lib/teamVisual";
import {
  Trophy,
  Users,
  UserPlus,
  Flame,
  Target,
  CheckCircle2,
  Star,
  Play,
  Zap,
  Smartphone,
  Share2,
  ArrowRight,
} from "lucide-react";

/* ─── Types / constants ─── */
interface StandingRow {
  pos: number;
  id: string;
  name: string;
  P: number;
  W: number;
  L: number;
  T: number;
  Pts: number;
  NRR: number;
}
interface PoolStandings {
  pool: { id: string; name: string };
  standings: StandingRow[];
}
interface HomeData {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  standings: PoolStandings[];
}

const LIVE_S = new Set(["IN_PROGRESS", "INNINGS_BREAK", "TOSS"]);
const DONE_S = new Set(["COMPLETED", "FORFEITED", "ABANDONED"]);

type Filter = "all" | "live" | "upcoming" | "completed";

/* ─── Helpers ─── */
function getInnings(match: Match, teamId: string) {
  return match.innings?.find((i) => i.batting_team === teamId) ?? null;
}

function matchStatusChip(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return { label: "LIVE", dot: true, cls: "bg-live text-white" };
    case "TOSS":
      return { label: "TOSS", dot: true, cls: "bg-live/80 text-white" };
    case "INNINGS_BREAK":
      return { label: "INNINGS BREAK", dot: false, cls: "bg-neon-amber text-ink-950" };
    case "COMPLETED":
      return { label: "RESULT", dot: false, cls: "bg-white/10 text-ink-200" };
    case "FORFEITED":
      return { label: "FORFEIT", dot: false, cls: "bg-white/10 text-ink-300" };
    case "SCHEDULED":
      return { label: "UPCOMING", dot: false, cls: "bg-white/5 text-ink-400 border border-white/10" };
    default:
      return { label: status.replace(/_/g, " "), dot: false, cls: "bg-white/10 text-ink-300" };
  }
}

/* ═══════════════════════════════════════════════════════════
   FEATURE HIGHLIGHTS
   ═══════════════════════════════════════════════════════════ */
function FeatureHighlights() {
  const features = [
    {
      tag: "LIVE SCORING",
      title: "Cinematic Scorecards",
      desc: "Every boundary and wicket updated ball-by-ball with stunning visuals for spectators.",
      icon: <Zap className="w-5 h-5 text-neon-cyan" />,
      color: "from-neon-cyan/10 to-transparent"
    },
    {
      tag: "TOURNAMENT OPS",
      title: "Auto Points Table",
      desc: "Real-time NRR calculation and automated group rankings. No more manual excel sheets.",
      icon: <Trophy className="w-5 h-5 text-neon-amber" />,
      color: "from-neon-amber/20 to-transparent"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-12 animate-rise [animation-delay:400ms]">
      {features.map((f, i) => (
        <div key={i} className="relative group overflow-hidden rounded-[2.5rem] glass border border-white/10 p-8 flex items-start gap-6 hover:bg-white/[0.04] transition-all duration-500">
           <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
           <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
              {f.icon}
           </div>
           <div className="relative z-10 text-left">
              <span className="text-[10px] font-black tracking-[.3em] text-ink-500 uppercase">{f.tag}</span>
              <h3 className="text-lg font-display font-bold text-white mt-1">{f.title}</h3>
              <p className="text-sm text-ink-400 mt-2 leading-relaxed">{f.desc}</p>
           </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MATCH CARD — list item card
   ═══════════════════════════════════════════════════════════ */
function MatchCard({
  match,
  teamMap,
}: {
  match: Match;
  teamMap: Record<string, Team>;
}) {
  const t1 = teamMap[match.team1];
  const t2 = teamMap[match.team2];
  const s1 = t1 ? getInnings(match, t1.id) : null;
  const s2 = t2 ? getInnings(match, t2.id) : null;
  const isLive = LIVE_S.has(match.status);
  const isDone = DONE_S.has(match.status);
  const chip = matchStatusChip(match.status);

  const winner = match.winner ? teamMap[match.winner] : null;

  function row(team?: Team, inn?: Innings | null, isWinner?: boolean) {
    if (!team) {
      return (
        <div className="flex items-center gap-3 py-1.5">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5" />
          <p className="text-ink-500 text-sm">TBD</p>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-3 py-1.5 ${isDone && !isWinner ? "opacity-55" : ""}`}>
        <TeamBadge name={team.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-white text-sm truncate">
            {team.name}
          </p>
          {inn ? (
            <p className="text-[11px] text-ink-500 font-mono mt-0.5">
              {inn.total_overs} ov
            </p>
          ) : null}
        </div>
        {inn ? (
          <p className="font-display font-bold tabular-nums text-white text-lg">
            {inn.total_runs}
            <span className="text-ink-500 text-xs font-semibold">
              /{inn.total_wickets}
            </span>
          </p>
        ) : (
          <span className="text-ink-600 text-[11px]">—</span>
        )}
      </div>
    );
  }

  return (
    <Link
      to={`/m/${match.id}`}
      className={`relative block rounded-2xl overflow-hidden transition-all group ${
        isLive
          ? "bg-ink-800 border border-live/30 hover:border-live/60 shadow-[0_10px_30px_-15px_rgba(255,59,71,.3)]"
          : "bg-ink-800/70 border border-white/5 hover:border-white/15 hover:bg-ink-800"
      }`}
    >
      {isLive && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-live via-neon-amber to-live bg-[length:200%_100%] animate-shimmer"
        />
      )}

      {/* Top meta */}
      <div className="px-4 py-2.5 flex justify-between items-center border-b border-white/[.04]">
        <span className="text-[10px] text-ink-500 font-display uppercase tracking-[.18em]">
          M{match.match_number} · {match.stage.replace("_", " ")}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-[9.5px] font-display font-bold px-2.5 py-1 rounded-full uppercase tracking-[.18em] ${chip.cls}`}
        >
          {chip.dot && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
          {chip.label}
        </span>
      </div>

      <div className="px-4 py-2.5">
        {row(t1, s1, isDone ? winner?.id === t1?.id : undefined)}
        {row(t2, s2, isDone ? winner?.id === t2?.id : undefined)}
      </div>

      {match.result_summary ? (
        <div className="px-4 pb-3 pt-0">
          <p className="text-[11px] text-neon-cyan font-display font-medium border-t border-white/5 pt-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{match.result_summary}</span>
          </p>
        </div>
      ) : match.status === "SCHEDULED" ? (
        <div className="px-4 pb-3">
          <p className="text-[10.5px] text-ink-500 border-t border-white/5 pt-2.5 uppercase tracking-wider font-display">
            Starts soon
          </p>
        </div>
      ) : null}
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING HERO
   ═══════════════════════════════════════════════════════════ */
function LandingHero() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-hero" />
      <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-violet/20 blur-[120px] rounded-full animate-pulse delay-700" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-20 md:pb-32 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[.04] border border-white/10 mb-8 backdrop-blur-md animate-rise">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan" />
          </span>
          <span className="text-xs font-display font-bold uppercase tracking-[.25em] text-ink-200">
            Professional Gully Cricket Platform
          </span>
        </div>

        <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-[10rem] text-white tracking-tighter leading-[0.85] mb-10 animate-rise [animation-delay:100ms]">
          STREETS GET <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-violet">THEIR STADIUM</span>
        </h1>

        <p className="max-w-2xl mx-auto text-ink-300 text-lg md:text-2xl font-display leading-relaxed mb-12 animate-rise [animation-delay:200ms]">
          Ball-by-ball scoring, cinematic spectator modes, and tournament management 
          for the local legends. Broadcast your gully cricket like the big leagues.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-rise [animation-delay:300ms]">
          <Link
            to="/register"
            className="group relative inline-flex items-center gap-4 bg-white text-ink-950 font-display font-black px-10 py-5 rounded-2xl hover:bg-neon-cyan transition-all duration-500 transform hover:-translate-y-2 shadow-glow-white hover:shadow-glow-cyan text-base"
          >
            <Trophy className="w-5 h-5" />
            ORGANIZE TOURNAMENT
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link
            to="/register"
            className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-display font-bold hover:bg-white/10 transition-all text-base group"
          >
            <UserPlus className="w-5 h-5 text-neon-violet group-hover:scale-110 transition-transform" />
            SIGN UP
          </Link>

          <button
            onClick={() => document.getElementById('live-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-transparent text-ink-400 font-display font-bold hover:text-white transition-all text-base group"
          >
            <Play className="w-5 h-5 text-neon-cyan group-hover:scale-110 transition-transform" />
            WATCH LIVE
          </button>
        </div>

        <FeatureHighlights />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES GRID
   ═══════════════════════════════════════════════════════════ */
function FeaturesGrid() {
  const features = [
    {
      icon: <Target className="w-8 h-8 text-neon-cyan" />,
      title: "Precision Scoring",
      desc: "Instant ball-by-ball updates. Wide, No, Wickets, and Auto-over tracking with zero lag."
    },
    {
      icon: <Users className="w-8 h-8 text-neon-violet" />,
      title: "Team Portals",
      desc: "Every team gets a profile. Track player stats, match history, and NRR automatically."
    },
    {
      icon: <Share2 className="w-8 h-8 text-live" />,
      title: "Social Broadcast",
      desc: "One-click sharing to WhatsApp & Socials. Fans get a cinematic 'Live Card' view."
    },
    {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
      title: "Fair Play Engine",
      desc: "NRR calculated live. Automated points tables and pool rankings eliminate disputes."
    }
  ];

  return (
    <section className="py-32 px-6 bg-[#080910]">
       <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
             <div className="space-y-8 text-center lg:text-left">
                <p className="text-neon-cyan font-display font-bold uppercase tracking-[.4em]">Engineered for Legends</p>
                <h2 className="text-5xl md:text-7xl font-display font-black text-white leading-tight">
                  EVERY BALL <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-violet to-neon-cyan">MATTERS.</span>
                </h2>
                <p className="text-ink-400 text-xl leading-relaxed font-display">
                  We built the engine that handles the chaos of gully cricket. 
                  From variable overs to manual score overrides, we've got you covered.
                </p>
                <div className="pt-8">
                   <Link to="/login" className="inline-flex items-center gap-3 text-white font-black border-b-2 border-neon-cyan pb-2 hover:text-neon-cyan transition text-lg">
                      Explore the organizer dashboard <ArrowRight className="w-5 h-5" />
                   </Link>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {features.map((f, i) => (
                  <div key={i} className="glass p-8 rounded-[2.5rem] hover:bg-white/[0.04] transition group">
                     <div className="mb-6 w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {f.icon}
                     </div>
                     <h3 className="text-xl font-bold text-white mb-3 font-display">{f.title}</h3>
                     <p className="text-ink-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const loadData = useCallback(async () => {
    try {
      const tourRes = await publicApi.get("/tournaments/");
      const tournaments: Tournament[] =
        tourRes.data.results ?? tourRes.data;

      if (!tournaments.length) {
        setLoading(false);
        return;
      }

      const featured =
        tournaments.find(
          (t) => t.status === "POOL_STAGE" || t.status === "KNOCKOUTS"
        ) ??
        tournaments.find((t) => t.status === "SETUP") ??
        tournaments[0];

      const [tRes, mRes, sRes] = await Promise.all([
        publicApi.get(`/tournaments/${featured.id}/teams/`),
        publicApi.get(`/tournaments/${featured.id}/matches/`),
        publicApi.get(`/tournaments/${featured.id}/standings/`),
      ]);

      setData({
        tournament: featured,
        teams: tRes.data.results ?? tRes.data,
        matches: mRes.data.results ?? mRes.data,
        standings: Array.isArray(sRes.data) ? sRes.data : [],
      });
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) return;
    const hasLive = data.matches.some((m) => LIVE_S.has(m.status));
    if (!hasLive) return;
    const id = setInterval(loadData, 12000);
    return () => clearInterval(id);
  }, [data, loadData]);

  const teamMap: Record<string, Team> = useMemo(
    () => (data ? Object.fromEntries(data.teams.map((t) => [t.id, t])) : {}),
    [data]
  );

  const liveMatches =
    data?.matches.filter((m) => LIVE_S.has(m.status)) ?? [];
  
  const filtered = (data?.matches ?? []).filter((m) => {
    if (filter === "live") return LIVE_S.has(m.status);
    if (filter === "upcoming") return m.status === "SCHEDULED";
    if (filter === "completed") return DONE_S.has(m.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col selection:bg-neon-cyan/30">
      <PublicNav liveCount={liveMatches.length} />

      <LandingHero />

      {/* ╔════════════ LIVE SECTION ════════════╗ */}
      <section id="live-section" className="py-32 px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-pulse">
                <div className="lg:col-span-2 h-[600px] bg-white/5 rounded-[3rem]" />
                <div className="h-[600px] bg-white/5 rounded-[3rem]" />
             </div>
          ) : data ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
              {/* Matches column */}
              <div className="lg:col-span-2 space-y-12">
                <div className="flex flex-col items-center lg:items-start justify-between flex-wrap gap-6 text-center lg:text-left">
                  <div>
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                       <div className="w-2 h-2 rounded-full bg-live animate-ping" />
                       <p className="text-neon-cyan font-display font-bold text-sm uppercase tracking-[.3em]">Featured Tournament</p>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-display font-black text-white tracking-tighter">{data.tournament.name}</h2>
                  </div>
                  <SegmentedFilter value={filter} onChange={setFilter} />
                </div>

                {data.tournament.status === 'SETUP' && (
                  <div className="relative group overflow-hidden rounded-[3rem] glass border border-neon-cyan/30 p-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-12 shadow-glow-cyan/5">
                     <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-40" />
                     <div className="relative z-10 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-[10px] text-neon-cyan font-black uppercase tracking-widest">
                           <UserPlus className="w-3.5 h-3.5" /> Enrollment Open
                        </div>
                        <h3 className="text-3xl font-display font-black text-white leading-none">Register your squad</h3>
                        <p className="text-ink-400 text-sm max-w-sm">Secure your spot in the bracket. Team name and player roster required to initialize.</p>
                     </div>
                     <Link 
                       to={`/tournaments/${data.tournament.id}/register`}
                       className="relative z-10 px-10 py-5 rounded-2xl bg-neon-cyan text-ink-950 font-display font-black uppercase tracking-[.2em] text-xs shadow-glow-cyan hover:bg-cyan-400 transition-all transform hover:-translate-y-1 active:scale-95"
                     >
                        Claim Spot
                     </Link>
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="rounded-[3rem] border border-dashed border-white/10 bg-white/[.02] py-32 text-center">
                    <p className="text-ink-500 font-display text-lg">
                      No {filter !== "all" ? filter : ""} matches found
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {filtered.map((m) => (
                      <MatchCard key={m.id} match={m} teamMap={teamMap} />
                    ))}
                  </div>
                )}
              </div>

              {/* Standings column */}
              <aside className="space-y-8">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                  <Trophy className="w-6 h-6 text-neon-amber" />
                  <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase">Leaderboard</h3>
                </div>
                
                {data.standings.length === 0 ? (
                  <div className="rounded-[3rem] border border-dashed border-white/10 bg-white/[.02] py-32 text-center">
                    <Trophy className="w-12 h-12 text-ink-700 mx-auto mb-6 opacity-30" />
                    <p className="text-ink-500 font-display">
                      Standings will appear soon
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {data.standings.map((ps) => (
                      <StandingsCard
                        key={ps.pool.id}
                        ps={ps}
                        multi={data.standings.length > 1}
                      />
                    ))}
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <div className="text-center py-32 bg-white/[.02] rounded-[4rem] border border-white/5">
               <Trophy className="w-16 h-16 text-ink-700 mx-auto mb-8 opacity-40" />
               <h3 className="text-3xl font-display font-black text-white mb-4">No Active Tournaments</h3>
               <p className="text-ink-500 text-lg">Sign in as an organizer to launch your own tournament now!</p>
            </div>
          )}
        </div>
      </section>

      <FeaturesGrid />

      {/* ╔════════════ READY CTA ════════════╗ */}
      <section className="py-24 px-6">
         <div className="max-w-5xl mx-auto glass rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-violet/10 blur-[100px]" />
            
            <h2 className="text-4xl md:text-7xl font-display font-black text-white leading-[0.9] tracking-tighter mb-10 z-10 relative">
               STREET CRICKET <br />
               HAS A NEW <br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-violet">CHAMPION.</span>
            </h2>
            
            <p className="text-ink-400 text-xl md:text-2xl mb-12 max-w-2xl mx-auto z-10 relative">
               Join 500+ organizers professionalizing their local games with the Gully Cricket platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 z-10 relative">
                <Link to="/login" className="bg-white text-ink-950 font-display font-black px-12 py-6 rounded-[2rem] hover:bg-neon-cyan transition-all duration-500 shadow-glow-white hover:shadow-glow-cyan transform hover:-translate-y-2 text-lg">
                   GET STARTED NOW
                </Link>
                <div className="flex -space-x-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-12 h-12 rounded-full border-4 border-ink-950 bg-white/10 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                     </div>
                   ))}
                   <div className="w-12 h-12 rounded-full border-4 border-ink-950 bg-neon-cyan text-ink-950 flex items-center justify-center text-[10px] font-black">
                      +500
                   </div>
                </div>
            </div>
         </div>
      </section>

      {/* ╔════════════ FOOTER ════════════╗ */}
      <footer className="border-t border-white/5 py-24 px-6 bg-[#05060A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-20 mb-20">
            <div className="max-w-sm">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
                  <Trophy className="w-6 h-6 text-ink-900" />
                </div>
                <span className="font-display font-black text-2xl text-white tracking-tighter uppercase">Gully Cricket</span>
              </div>
              <p className="text-ink-500 text-lg leading-relaxed font-display text-center lg:text-left">
                Empowering local cricket communities with professional-grade tournament 
                management and broadcasting tools. Every gully has a story.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              <div>
                <h4 className="text-white font-display font-black mb-8 uppercase tracking-[.3em] text-[10px]">Platform</h4>
                <ul className="space-y-4 text-sm font-bold text-ink-600">
                  <li><Link to="/login" className="hover:text-neon-cyan transition">Organizer Login</Link></li>
                  <li><Link to="/register" className="hover:text-neon-cyan transition">Register Team</Link></li>
                  <li><button onClick={() => window.scrollTo(0,0)} className="hover:text-neon-cyan transition">Live Terminal</button></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-display font-black mb-8 uppercase tracking-[.3em] text-[10px]">Company</h4>
                <ul className="space-y-4 text-sm font-bold text-ink-600">
                  <li><a href="#" className="hover:text-neon-cyan transition">About</a></li>
                  <li><a href="#" className="hover:text-neon-cyan transition">Media Kit</a></li>
                  <li><a href="#" className="hover:text-neon-cyan transition">Contact</a></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-white font-display font-black mb-8 uppercase tracking-[.3em] text-[10px]">Newsletter</h4>
                <div className="flex gap-2">
                   <input placeholder="Email" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-neon-cyan outline-none w-full" />
                   <button className="bg-white text-ink-950 p-2 rounded-xl hover:bg-neon-cyan transition"><ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-ink-700 text-[10px] font-black uppercase tracking-[.3em]">
              &copy; 2026 GULLY_CRICKET_PRO · ALL_SYSTEMS_OPERATIONAL
            </p>
            <div className="flex items-center gap-8">
               <a href="#" className="text-ink-600 hover:text-white transition text-[10px] font-black uppercase tracking-widest">Twitter</a>
               <a href="#" className="text-ink-600 hover:text-white transition text-[10px] font-black uppercase tracking-widest">Instagram</a>
               <a href="#" className="text-ink-600 hover:text-white transition text-[10px] font-black uppercase tracking-widest">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── STANDINGS ─── */
function StandingsCard({
  ps,
  multi,
}: {
  ps: PoolStandings;
  multi: boolean;
}) {
  return (
    <div className="rounded-[2.5rem] overflow-hidden bg-ink-800/70 border border-white/[.06] shadow-2xl">
      {multi && (
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-white/[.02]">
          <Trophy className="w-4 h-4 text-neon-amber" />
          <p className="text-xs font-display font-black uppercase tracking-[.25em] text-ink-200">
            {ps.pool.name}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-white/[.01]">
              {["#", "Team", "P", "W", "L", "Pts", "NRR"].map((h) => (
                <th
                  key={h}
                  className={`py-5 font-display font-black text-[10px] uppercase tracking-[.2em] text-ink-500 ${
                    h === "Team" ? "text-left px-6" : "text-center px-2"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ps.standings.map((row, i) => {
              const isTop = i === 0;
              const c = teamColor(row.name);
              return (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 border-white/[.04] transition-colors ${
                    isTop ? "bg-neon-amber/[.03]" : "hover:bg-white/[.01]"
                  }`}
                >
                  <td className="py-5 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-display font-black text-[11px] ${
                        isTop
                          ? "bg-gradient-to-br from-neon-amber to-orange-500 text-ink-950 shadow-glow-amber"
                          : "bg-white/5 text-ink-400"
                      }`}
                    >
                      {row.pos}
                    </span>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <TeamBadge name={row.name} size="xs" />
                      <span className="font-display font-bold text-white text-sm">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-2 text-center tabular-nums text-ink-400 font-bold">
                    {row.P}
                  </td>
                  <td className="py-5 px-2 text-center tabular-nums font-black text-emerald-400">
                    {row.W}
                  </td>
                  <td className="py-5 px-2 text-center tabular-nums font-black text-rose-400">
                    {row.L}
                  </td>
                  <td className="py-5 px-2 text-center tabular-nums font-display font-black text-white text-base">
                    {row.Pts}
                  </td>
                  <td
                    className={`py-5 px-2 text-center tabular-nums text-[11px] font-bold ${
                      row.NRR >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {row.NRR >= 0 ? "+" : ""}
                    {row.NRR.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentedFilter({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
}) {
  const opts: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Results" },
  ];
  return (
    <div className="inline-flex p-1.5 rounded-[1.5rem] bg-ink-800/80 border border-white/[.06] backdrop-blur-xl">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-6 py-2.5 rounded-2xl text-[11px] font-display font-black uppercase tracking-[.2em] transition-all duration-300 ${
            value === o.key
              ? "bg-white text-ink-950 shadow-2xl shadow-white/20 scale-105"
              : "text-ink-500 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
