import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import publicApi from "../services/publicApi";
import type { Match, Team, Innings, Ball, Player } from "../types";
import { PublicNav } from "../components/layout/PublicNav";
import { TeamBadge } from "../components/ui/TeamBadge";
import { teamColor } from "../lib/teamVisual";
import {
  computeBatting,
  computeBowling,
  computeFallOfWickets,
  buildCommentary,
  type BatterRow,
  type BowlerRow,
  type WicketRow,
  type CommentaryItem,
} from "../lib/matchStats";
import {
  ArrowLeft,
  RefreshCw,
  Target,
  Activity,
  Clock,
  Flag,
  Trophy,
  Coins,
  ChevronLeft,
  CircleDot,
  Star,
  MessageSquareText,
  TrendingUp,
  Share2,
  Bell,
  Zap,
  LayoutDashboard
} from "lucide-react";
import toast from "react-hot-toast";

interface InningsBundle {
  innings: Innings;
  balls: Ball[];
}

interface MatchData {
  match: Match;
  teams: Team[];
  bundles: InningsBundle[];
  target: number | null;
}

const LIVE_S = new Set(["IN_PROGRESS", "INNINGS_BREAK", "TOSS"]);

/* ─── Ball orb helpers ─── */
function ballClass(b: Ball) {
  if (b.is_wicket)
    return "bg-gradient-to-br from-rose-500 to-rose-700 text-white ring-2 ring-rose-400/50 shadow-[0_0_20px_-5px_rgba(244,63,94,.7)]";
  if (b.runs_scored === 6)
    return "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,.6)]";
  if (b.runs_scored === 4 || b.is_boundary)
    return "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_16px_-4px_rgba(16,185,129,.6)]";
  if (b.is_wide || b.is_noball)
    return "bg-gradient-to-br from-amber-400 to-amber-600 text-ink-950 shadow-[0_0_14px_-4px_rgba(255,176,32,.6)]";
  if (b.runs_scored === 0)
    return "bg-ink-800/80 text-ink-500 border border-white/5";
  return "bg-ink-600 text-white";
}

function ballText(b: Ball) {
  if (b.is_wicket) return "W";
  if (b.is_wide) return `Wd${b.extra_runs > 0 ? "+" + b.extra_runs : ""}`;
  if (b.is_noball) return `Nb${b.runs_scored > 0 ? "+" + b.runs_scored : ""}`;
  if (b.runs_scored === 0) return "·";
  return String(b.runs_scored);
}

function statusRibbon(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return { label: "Live Broadcast", tone: "live" as const, desc: "Updates real-time as balls are bowled" };
    case "TOSS":
      return { label: "Prematch Ceremony", tone: "live" as const, desc: "Toss is currently being held" };
    case "INNINGS_BREAK":
      return { label: "Innings Break", tone: "amber" as const, desc: "Strategizing for the chase" };
    case "COMPLETED":
      return { label: "Final Result", tone: "emerald" as const, desc: "The mission has concluded" };
    case "FORFEITED":
      return { label: "Mission Aborted", tone: "muted" as const, desc: "One team has withdrawn" };
    case "SCHEDULED":
      return { label: "Awaiting Kickoff", tone: "muted" as const, desc: "Match starts shortly" };
    default:
      return { label: status.replace(/_/g, " "), tone: "muted" as const, desc: "System Status: Active" };
  }
}

function oversToBalls(ov: number | string) {
  const v = Number(ov);
  const full = Math.floor(v);
  const rem = Math.round((v - full) * 10);
  return full * 6 + rem;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function PublicMatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const [matchRes, scorecardRes] = await Promise.all([
          publicApi.get(`/matches/${id}/`),
          publicApi.get(`/matches/${id}/scorecard/`),
        ]);
        const match: Match = matchRes.data;
        const teamsRes = await publicApi.get(
          `/tournaments/${match.tournament}/teams/`
        );
        const teams: Team[] = teamsRes.data.results ?? teamsRes.data;

        const scorecardInnings = (scorecardRes.data.innings ?? []) as Array<{
          innings: Innings;
          balls: Ball[];
        }>;
        const bundles: InningsBundle[] = (match.innings ?? []).map((inn) => {
          const payload = scorecardInnings.find(
            (si) => si.innings?.id === inn.id
          );
          return { innings: inn, balls: payload?.balls ?? [] };
        });

        const inn1 = match.innings?.find((i) => i.innings_number === 1);
        const activeInn =
          match.innings?.find((i) => !i.is_completed) ??
          match.innings?.[match.innings.length - 1];
        const target =
          activeInn?.innings_number === 2 && inn1 ? inn1.total_runs + 1 : null;

        setData({ match, teams, bundles, target });
        setLastUpdated(new Date());
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data?.match) return;
    if (!LIVE_S.has(data.match.status)) return;
    const timer = setInterval(() => loadData(true), 10000);
    return () => clearInterval(timer);
  }, [data?.match?.status, loadData]);

  const teamMap: Record<string, Team> = useMemo(
    () => (data ? Object.fromEntries(data.teams.map((t) => [t.id, t])) : {}),
    [data]
  );

  const playerMap: Record<string, Player> = useMemo(() => {
    const pm: Record<string, Player> = {};
    data?.teams.forEach((t) =>
      t.players?.forEach((p) => {
        pm[p.id] = p;
      })
    );
    return pm;
  }, [data]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Broadcast link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col">
        <PublicNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
           <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
                 <Zap className="w-8 h-8 text-neon-cyan animate-bounce" />
              </div>
              <div className="absolute -inset-4 bg-neon-cyan/20 blur-2xl rounded-full animate-pulse" />
           </div>
           <p className="mt-8 text-xs font-black uppercase tracking-[.3em] text-ink-500 animate-pulse">Syncing with Ground Control...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col">
        <PublicNav />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
               <Flag className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-display font-black text-white mb-2">Signal Lost</h2>
            <p className="text-ink-500 text-sm mb-8 leading-relaxed">We couldn't establish a link to this match protocol. It may have been archived or deleted.</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 bg-white text-ink-950 font-display font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:bg-neon-cyan transition shadow-glow-white/20"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { match, bundles, target } = data;
  const t1 = teamMap[match.team1];
  const t2 = teamMap[match.team2];
  const inn1 = match.innings?.find((i) => i.innings_number === 1);
  const inn2 = match.innings?.find((i) => i.innings_number === 2);
  const activeInn = match.innings?.find((i) => !i.is_completed) ?? (inn2 || inn1);
  const battingTeam = activeInn ? teamMap[activeInn.batting_team] : null;
  const bowlingTeam = activeInn ? teamMap[activeInn.bowling_team] : null;
  const activeBundle = activeInn ? bundles.find((b) => b.innings.id === activeInn.id) : null;

  const isLive = LIVE_S.has(match.status);
  const ribbon = statusRibbon(match.status);

  const currentOverNum = activeInn ? Math.floor(Number(activeInn.total_overs)) : 0;
  const currentOverBalls = activeBundle?.balls.filter((b) => b.over_number === currentOverNum) ?? [];
  const needRuns = target && activeInn ? Math.max(0, target - activeInn.total_runs) : null;

  const activeBalls = activeInn ? oversToBalls(activeInn.total_overs) : 0;
  const crr = activeInn && activeBalls > 0 ? ((activeInn.total_runs / activeBalls) * 6).toFixed(2) : "0.00";
  const firstInnBalls = inn1 ? oversToBalls(inn1.total_overs) : null;
  const maxBalls = firstInnBalls ?? null;
  const ballsLeft = maxBalls && activeInn?.innings_number === 2 ? Math.max(0, maxBalls - activeBalls) : null;
  const rrr = needRuns !== null && ballsLeft && ballsLeft > 0 ? ((needRuns / ballsLeft) * 6).toFixed(2) : null;

  const t1Inn = [inn1, inn2].find((x) => x && x.batting_team === match.team1);
  const t2Inn = [inn1, inn2].find((x) => x && x.batting_team === match.team2);

  return (
    <div className="min-h-screen bg-ink-950 text-white selection:bg-neon-cyan/30 flex flex-col relative overflow-hidden">
      <PublicNav liveCount={isLive ? 1 : 0} />

      {/* Background Ambience */}
      <div className="absolute inset-0 mesh-live opacity-30 pointer-events-none" />
      
      {/* ╔════════════ STATUS BAR ════════════╗ */}
      <div className={`relative z-20 border-b border-white/5 backdrop-blur-md px-4 md:px-6 py-2.5 flex items-center justify-between ${
        ribbon.tone === 'live' ? 'bg-rose-600/10' : 'bg-ink-900/60'
      }`}>
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
             ribbon.tone === 'live' ? 'bg-rose-500 border-rose-400/50 shadow-glow-live' : 'bg-white/5 border-white/10'
           }`}>
             {isLive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
             <span className={`text-[10px] font-black uppercase tracking-widest ${
               ribbon.tone === 'live' ? 'text-white' : 'text-ink-400'
             }`}>{ribbon.label}</span>
           </div>
           <p className="text-[10px] text-ink-600 font-bold uppercase tracking-widest hidden md:block">
             {ribbon.desc}
           </p>
        </div>
        <div className="flex items-center gap-4">
           {lastUpdated && (
             <p className="text-[10px] text-ink-500 font-mono">Synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
           )}
           <button onClick={handleShare} className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-ink-500 hover:text-white transition-colors">
              <Share2 className="w-3.5 h-3.5" />
           </button>
           <button onClick={() => loadData(true)} className={`p-1.5 rounded-lg bg-white/5 border border-white/5 text-ink-500 hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        
        {/* ╔════════════ HERO BOARD ════════════╗ */}
        <section className="relative py-12 md:py-16 px-4 border-b border-white/[.04]">
          <div className="absolute inset-0 bg-grid-dark bg-grid-32 opacity-10" />
          
          <div className="relative max-w-6xl mx-auto">
             <div className="flex items-center justify-between mb-12 opacity-50">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-ink-400">
                   <LayoutDashboard className="w-3.5 h-3.5" /> Event Hub
                </div>
                <div className="h-px flex-1 mx-6 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-ink-400">
                   Session #{match.match_number}
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-12 lg:gap-20">
                <HeroTeamBlock 
                  team={t1} 
                  inn={t1Inn} 
                  isBatting={battingTeam?.id === match.team1} 
                  align="left" 
                  isWinner={match.winner === match.team1}
                />
                
                <div className="flex flex-col items-center gap-6">
                   <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-ink-600 uppercase tracking-[.4em]">VS</div>
                   <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent hidden lg:block" />
                </div>

                <HeroTeamBlock 
                  team={t2} 
                  inn={t2Inn} 
                  isBatting={battingTeam?.id === match.team2} 
                  align="right" 
                  isWinner={match.winner === match.team2}
                />
             </div>

             {/* Ticker / Summary */}
             <div className="mt-16 flex flex-col items-center gap-6">
                {match.result_summary ? (
                  <div className="group relative">
                     <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="relative glass-strong px-10 py-5 rounded-[2.5rem] border border-emerald-500/30 flex items-center gap-4 animate-rise">
                        <Trophy className="w-6 h-6 text-emerald-400 drop-shadow-glow" />
                        <div className="h-6 w-px bg-white/10" />
                        <p className="font-display font-black text-white text-lg tracking-tight uppercase">{match.result_summary}</p>
                     </div>
                  </div>
                ) : target && needRuns !== null && activeInn && !activeInn.is_completed ? (
                  <div className="flex flex-col items-center gap-4">
                     <div className="flex items-center gap-3 glass px-8 py-3.5 rounded-2xl border border-neon-amber/30 animate-pulse-slow">
                        <Target className="w-4 h-4 text-neon-amber" />
                        <p className="font-display font-black text-white text-sm uppercase tracking-widest leading-none">
                           {battingTeam?.name} <span className="text-neon-amber">Require {needRuns}</span> from {ballsLeft} Balls
                        </p>
                     </div>
                     <p className="text-[10px] text-ink-600 font-bold uppercase tracking-[.2em]">Target Score: {target}</p>
                  </div>
                ) : (
                   <div className="glass px-6 py-2.5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-[.25em] text-ink-500">
                      Match Session Ongoing
                   </div>
                )}
             </div>
          </div>
        </section>

        {/* ╔════════════ DATA STRIP ════════════╗ */}
        {isLive && activeInn && (
           <div className="bg-ink-900/40 border-b border-white/5 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/5">
                 <MetricCell label="Current Rate" value={crr} icon={<Activity className="w-3.5 h-3.5" />} />
                 {rrr !== null ? (
                   <MetricCell label="Required Rate" value={rrr} icon={<Target className="w-3.5 h-3.5" />} highlight />
                 ) : (
                   <MetricCell label="Run Rate" value={crr} icon={<TrendingUp className="w-3.5 h-3.5" />} />
                 )}
                 <MetricCell label="Total Extras" value={activeInn.extras} icon={<CircleDot className="w-3.5 h-3.5" />} />
                 <MetricCell label="Overs Completed" value={activeInn.total_overs} icon={<Clock className="w-3.5 h-3.5" />} />
              </div>
           </div>
        )}

        {/* ╔════════════ BROADCAST AREA ════════════╗ */}
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10">
           
           <div className="space-y-12">
              {/* CURRENT OVER & CREASE */}
              {isLive && activeBundle && battingTeam && bowlingTeam && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <SectionTitle title="This Over Progression" hint={bowlingTeam.name} />
                      <div className="flex flex-wrap gap-3">
                        {currentOverBalls.map((b, i) => (
                           <BallOrb key={b.id || i} ball={b} big delay={i * 50} />
                        ))}
                        {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
                           <div key={`ph-${i}`} className="w-14 h-14 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-6">
                      <SectionTitle title="Active at the Crease" />
                      <AtTheCreasePanel 
                        balls={activeBundle.balls} 
                        battingTeamPlayers={battingTeam.players} 
                        bowlingTeamPlayers={bowlingTeam.players} 
                        playerMap={playerMap} 
                        inningsCompleted={activeInn.is_completed} 
                      />
                   </div>
                </div>
              )}

              {/* SCORECARDS */}
              <div className="space-y-10">
                 <SectionTitle title="Statistical Scorecard" />
                 {bundles.map((bundle) => (
                    <DetailedScorecard 
                      key={bundle.innings.id} 
                      bundle={bundle} 
                      teamMap={teamMap} 
                      playerMap={playerMap} 
                      isActive={bundle.innings.id === activeInn?.id && isLive} 
                    />
                 ))}
                 
                 {bundles.length === 0 && (
                   <div className="py-24 glass rounded-[2.5rem] border border-white/5 border-dashed text-center">
                      <Clock className="w-10 h-10 text-ink-700 mx-auto mb-4" />
                      <p className="text-ink-600 font-bold uppercase tracking-widest text-xs">Awaiting first delivery</p>
                   </div>
                 )}
              </div>
           </div>

           {/* SIDEBAR - COMMENTARY & SQUADS */}
           <aside className="space-y-10">
              {activeBundle && activeBundle.balls.length > 0 && (
                 <CommentarySection balls={activeBundle.balls} playerMap={playerMap} isLive={isLive} />
              )}
              
              <div className="space-y-6">
                 <SectionTitle title="Team Squads" />
                 <div className="space-y-4">
                    <SimpleSquad team={t1} />
                    <SimpleSquad team={t2} />
                 </div>
              </div>
           </aside>
        </div>
      </main>
      
      {/* ╔════════════ FOOTER ════════════╗ */}
      <footer className="border-t border-white/5 bg-ink-900/60 py-8 px-6 backdrop-blur-md">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate("/")} className="text-xs font-black uppercase tracking-widest text-ink-400 hover:text-white transition flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Exit View
               </button>
               <div className="w-px h-4 bg-white/10" />
               <p className="text-[10px] text-ink-600 font-bold uppercase tracking-widest">© 2026 Gully Cricket Protocol</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[10px] text-ink-500 font-bold uppercase">
                  <Bell className="w-3 h-3" /> Notifications On
               </div>
               <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[10px] text-ink-500 font-bold uppercase">
                  <Share2 className="w-3 h-3" /> Quick Share
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════ */

function HeroTeamBlock({ team, inn, isBatting, align, isWinner }: any) {
  if (!team) return <div className={`text-${align}`}>—</div>;
  const colors = teamColor(team.name);
  
  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
       <div className="relative group mb-6">
          <div className="absolute -inset-2 bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          <TeamBadge name={team.name} size="xl" ring />
       </div>
       
       <div className="space-y-2">
          <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
             <h2 className="text-3xl font-display font-black text-white tracking-tight leading-none">{team.name}</h2>
             {isWinner && <Trophy className="w-5 h-5 text-neon-amber animate-bounce" />}
          </div>
          
          {isBatting && (
            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-live ${align === 'right' ? 'flex-row-reverse' : ''}`}>
               <div className="w-2 h-2 rounded-full bg-live animate-pulse shadow-glow-live" />
               On Mission
            </div>
          )}
          
          {inn ? (
             <div className="pt-4">
                <div className="flex items-baseline gap-2 tabular-nums">
                   <span className="text-6xl font-display font-black text-white leading-none">{inn.total_runs}</span>
                   <span className="text-3xl font-display font-black text-ink-600">/{inn.total_wickets}</span>
                </div>
                <p className="text-xs text-ink-500 font-mono mt-3 uppercase tracking-widest">{inn.total_overs} Overs Logged</p>
             </div>
          ) : (
             <div className="pt-4 opacity-30">
                <p className="text-sm font-black uppercase tracking-widest text-ink-600">Awaiting Deployment</p>
             </div>
          )}
       </div>
    </div>
  );
}

function MetricCell({ label, value, icon, highlight }: any) {
  return (
    <div className="px-8 py-6 flex flex-col gap-2">
       <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] ${highlight ? 'text-neon-amber' : 'text-ink-600'}`}>
          {icon} {label}
       </div>
       <div className={`text-2xl font-display font-black tabular-nums ${highlight ? 'text-neon-amber' : 'text-white'}`}>
          {value}
       </div>
    </div>
  );
}

function SectionTitle({ title, hint }: any) {
  return (
    <div className="flex items-center justify-between mb-6">
       <h3 className="text-[10px] font-black uppercase tracking-[.3em] text-neon-cyan border-l-2 border-neon-cyan pl-3 leading-none">{title}</h3>
       {hint && <span className="text-[10px] font-bold text-ink-600 uppercase tracking-widest">{hint}</span>}
    </div>
  );
}

function AtTheCreasePanel({ balls, battingTeamPlayers, bowlingTeamPlayers, playerMap, inningsCompleted }: any) {
  const batters = computeBatting(balls, battingTeamPlayers, playerMap, inningsCompleted);
  const bowlers = computeBowling(balls, bowlingTeamPlayers, playerMap);
  const atCrease = batters.filter((b) => b.status === "batting");
  const lastBall = balls[balls.length - 1];
  const currentBowler = lastBall ? bowlers.find((b) => b.id === lastBall.bowler) : null;

  return (
    <div className="glass-strong rounded-[2rem] border border-white/5 overflow-hidden">
       <div className="divide-y divide-white/[.04]">
          {atCrease.map((b) => (
             <div key={b.id} className={`px-6 py-4 flex items-center justify-between transition-colors ${b.onStrike ? 'bg-neon-cyan/5' : ''}`}>
                <div className="flex items-center gap-4">
                   <div className={`w-2 h-2 rounded-full ${b.onStrike ? 'bg-neon-cyan shadow-glow-cyan' : 'bg-ink-700'}`} />
                   <div>
                      <p className="text-sm font-black text-white">{b.name}</p>
                      <p className="text-[10px] text-ink-500 font-bold uppercase tracking-widest mt-0.5">SR {b.sr.toFixed(1)} · {b.sixes}x6</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-display font-black text-white tabular-nums">{b.runs}<span className="text-xs text-ink-500 ml-1">({b.balls})</span></p>
                </div>
             </div>
          ))}
          {currentBowler && (
             <div className="px-6 py-4 bg-rose-600/5 flex items-center justify-between border-t border-rose-500/10">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-rose-500 shadow-glow-rose" />
                   <div>
                      <p className="text-sm font-black text-white">{currentBowler.name}</p>
                      <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Current Bowler</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-display font-black text-rose-400 tabular-nums">{currentBowler.wickets}/{currentBowler.runs}<span className="text-xs text-ink-600 ml-1">({currentBowler.oversText})</span></p>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}

function DetailedScorecard({ bundle, teamMap, playerMap, isActive }: any) {
  const innings = bundle.innings;
  const battingTeam = teamMap[innings.batting_team];
  const bowlingTeam = teamMap[innings.bowling_team];
  const batters = computeBatting(bundle.balls, battingTeam?.players ?? [], playerMap, innings.is_completed);
  const bowlers = computeBowling(bundle.balls, bowlingTeam?.players ?? [], playerMap);
  const fow = computeFallOfWickets(bundle.balls, playerMap);

  return (
    <div className="glass-strong rounded-[2.5rem] border border-white/5 overflow-hidden">
       <header className="px-8 py-6 flex items-center justify-between bg-white/[.02] border-b border-white/5">
          <div className="flex items-center gap-4">
             <TeamBadge name={battingTeam?.name} size="md" />
             <div>
                <h4 className="text-lg font-display font-black text-white leading-none">{battingTeam?.name}</h4>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-ink-500 mt-2">
                   {innings.innings_number === 1 ? 'Prime Innings' : 'The Pursuit'} 
                   {isActive && <span className="ml-2 text-live animate-pulse">● Live Transmission</span>}
                </p>
             </div>
          </div>
          <div className="text-right">
             <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-3xl font-display font-black text-white">{innings.total_runs}</span>
                <span className="text-xl font-display font-black text-ink-600">/{innings.total_wickets}</span>
             </div>
             <p className="text-[10px] text-ink-500 font-mono font-bold uppercase tracking-widest mt-1">{innings.total_overs} Overs Completed</p>
          </div>
       </header>

       <div className="p-2 md:p-6 overflow-x-auto">
          <table className="w-full text-sm">
             <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-ink-600 border-b border-white/5">
                   <th className="text-left py-4 px-4">Batter</th>
                   <th className="text-right py-4 px-4">Runs</th>
                   <th className="text-right py-4 px-4">Balls</th>
                   <th className="text-right py-4 px-4 hidden md:table-cell">4s</th>
                   <th className="text-right py-4 px-4 hidden md:table-cell">6s</th>
                   <th className="text-right py-4 px-4">S/R</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/[.02]">
                {batters.map(r => (
                   <tr key={r.id} className={`group transition-colors ${r.status === 'batting' ? 'bg-neon-cyan/5' : 'hover:bg-white/[.01]'}`}>
                      <td className="py-4 px-4">
                         <div className="flex items-center gap-3">
                            {r.onStrike && <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />}
                            <div>
                               <p className={`font-black ${r.status === 'batting' ? 'text-neon-cyan' : 'text-white'}`}>{r.name}</p>
                               <p className="text-[10px] text-ink-500 font-bold uppercase mt-0.5">
                                  {r.dismissal ? r.dismissal.text : (r.status === 'batting' ? 'Active at Crease' : 'Did not bat')}
                               </p>
                            </div>
                         </div>
                      </td>
                      <td className="py-4 px-4 text-right font-display font-black text-white tabular-nums">{r.runs}</td>
                      <td className="py-4 px-4 text-right font-mono text-ink-500 tabular-nums">{r.balls}</td>
                      <td className="py-4 px-4 text-right font-mono text-ink-500 tabular-nums hidden md:table-cell">{r.fours}</td>
                      <td className="py-4 px-4 text-right font-mono text-ink-500 tabular-nums hidden md:table-cell">{r.sixes}</td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-ink-400 tabular-nums">{r.sr.toFixed(1)}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function CommentarySection({ balls, playerMap, isLive }: any) {
  const items = buildCommentary(balls, playerMap, 12);
  return (
    <div className="glass-strong rounded-[2rem] border border-white/5 overflow-hidden">
       <header className="px-6 py-4 bg-white/[.02] border-b border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
             <MessageSquareText className="w-4 h-4 text-neon-cyan" /> Radio Broadcast
          </p>
          {isLive && <span className="text-[9px] font-black text-rose-500 animate-pulse uppercase tracking-widest">Live Flow</span>}
       </header>
       <div className="divide-y divide-white/[.04]">
          {items.map((c: any) => (
             <div key={c.id} className="px-6 py-4 flex gap-4 hover:bg-white/[.01] transition-colors">
                <div className="text-[10px] font-mono text-ink-600 w-10 shrink-0">{c.overBall}</div>
                <div>
                   <p className="text-xs text-white leading-relaxed">
                      <span className="font-black">{c.bowler}</span>
                      <span className="text-ink-600 mx-1">→</span>
                      <span className="font-black">{c.striker}</span>
                      <span className="text-ink-500 mx-2">·</span>
                      <span className={`font-black ${
                         c.tone === 'six' ? 'text-purple-400' :
                         c.tone === 'four' ? 'text-emerald-400' :
                         c.tone === 'wicket' ? 'text-rose-400' : 'text-white'
                      }`}>{c.title}</span>
                   </p>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function SimpleSquad({ team }: any) {
  if (!team) return null;
  return (
    <div className="glass rounded-2xl border border-white/5 p-5">
       <p className="text-[10px] font-black uppercase tracking-widest text-ink-600 mb-4">{team.name} Roster</p>
       <div className="flex flex-wrap gap-2">
          {team.players?.map((p: any) => (
             <span key={p.id} className="text-[10px] font-bold text-ink-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{p.name}</span>
          ))}
       </div>
    </div>
  );
}

function BallOrb({ ball, big, delay = 0 }: any) {
  return (
    <div
      className={`${big ? "w-14 h-14 text-lg" : "w-10 h-10 text-xs"} rounded-full flex items-center justify-center font-display font-black transition-all animate-rise ${ballClass(ball)} shadow-xl`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {ballText(ball)}
    </div>
  );
}
