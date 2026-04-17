// Pure functions that turn raw ball-by-ball data into scorecard rows.
// Used on the public live match page so fans get the full picture.

import type { Ball, Player } from "../types";

export interface BatterRow {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: number;
  onStrike: boolean;
  status: "batting" | "not-out" | "out";
  dismissal: {
    text: string;        // "c Smith b Bolt"
    type: string;        // "CAUGHT" / "BOWLED" / …
    overBall: string;    // "3.4"
    teamScore: string;   // "42/3"
  } | null;
}

export interface BowlerRow {
  id: string;
  name: string;
  oversText: string;   // "3.4"
  legalBalls: number;  // 22
  maidens: number;
  runs: number;        // conceded
  wickets: number;
  econ: number;
  dots: number;
  extras: number;      // wides + noballs against bowler
}

export interface WicketRow {
  wkt: number;           // 1st wicket, 2nd wicket, etc.
  playerOut: string;     // name
  bowler: string;        // name or ""
  type: string;          // BOWLED / CAUGHT / RUN_OUT / STUMPED / LBW / HIT_WICKET
  overBall: string;      // "3.4"
  teamScore: string;     // "42/3"
}

export interface CommentaryItem {
  id: string;
  overBall: string;
  bowler: string;
  striker: string;
  title: string;        // "SIX!" / "OUT!" / "FOUR!" / "1 run"
  desc: string;         // "driven through covers" (synthesized)
  tone: "six" | "four" | "wicket" | "extra" | "dot" | "run";
  isBoundary: boolean;
  isWicket: boolean;
}

function oversDisplay(legalBalls: number) {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
}

function playerName(id: string | null | undefined, pm: Record<string, Player>) {
  if (!id) return "—";
  return pm[id]?.name ?? "—";
}

function ballLocator(ballNum: number, overNum: number) {
  // Display as `over.ballInOver` (1-indexed ball within over).
  return `${overNum}.${ballNum + 1}`;
}

function dismissalText(b: Ball, pm: Record<string, Player>): string {
  const t = b.wicket_type?.toUpperCase() ?? "OUT";
  const bowler = playerName(b.bowler, pm);
  const fielder = b.fielder ? playerName(b.fielder, pm) : null;
  switch (t) {
    case "BOWLED":
      return `b ${bowler}`;
    case "CAUGHT":
      return fielder ? `c ${fielder} b ${bowler}` : `c & b ${bowler}`;
    case "LBW":
      return `lbw b ${bowler}`;
    case "STUMPED":
      return fielder ? `st ${fielder} b ${bowler}` : `stumped b ${bowler}`;
    case "RUN_OUT":
      return fielder ? `run out (${fielder})` : "run out";
    case "HIT_WICKET":
      return `hit wicket b ${bowler}`;
    default:
      return t.replace(/_/g, " ").toLowerCase();
  }
}

/* ─── BATTING ─── */

export function computeBatting(
  balls: Ball[],
  battingTeamPlayers: Player[],
  pm: Record<string, Player>,
  inningsCompleted: boolean
): BatterRow[] {
  const stats: Record<
    string,
    { runs: number; balls: number; fours: number; sixes: number }
  > = {};
  const dismissal: Record<
    string,
    { text: string; type: string; overBall: string; teamScore: string }
  > = {};

  let running = 0;
  let wktsSoFar = 0;
  const onCrease = new Set<string>();

  for (const b of balls) {
    onCrease.add(b.striker);
    onCrease.add(b.non_striker);
    stats[b.striker] ??= { runs: 0, balls: 0, fours: 0, sixes: 0 };
    if (!b.is_wide) stats[b.striker].balls++;
    stats[b.striker].runs += b.runs_scored;
    if (b.runs_scored === 4 && !b.is_wide && !b.is_noball)
      stats[b.striker].fours++;
    if (b.runs_scored === 6 && !b.is_wide && !b.is_noball)
      stats[b.striker].sixes++;

    running += b.total_runs;
    if (b.is_wicket) {
      wktsSoFar++;
      const out = b.dismissed_player ?? b.striker;
      dismissal[out] = {
        text: dismissalText(b, pm),
        type: b.wicket_type ?? "OUT",
        overBall: ballLocator(b.ball_number, b.over_number),
        teamScore: `${running}/${wktsSoFar}`,
      };
    }
  }

  const lastBall = balls[balls.length - 1];
  const currentStriker = lastBall?.striker;
  const currentNonStriker = lastBall?.non_striker;

  // Preserve batting order: players who came in first appear first in the feed.
  const firstAppearance: Record<string, number> = {};
  balls.forEach((b, i) => {
    if (!(b.striker in firstAppearance)) firstAppearance[b.striker] = i;
    if (!(b.non_striker in firstAppearance))
      firstAppearance[b.non_striker] = i;
  });

  const rows: BatterRow[] = battingTeamPlayers
    .filter((p) => p.id in firstAppearance)
    .sort((a, b) => firstAppearance[a.id] - firstAppearance[b.id])
    .map((p) => {
      const s = stats[p.id] ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
      const d = dismissal[p.id];
      const atCrease =
        !inningsCompleted &&
        (p.id === currentStriker || p.id === currentNonStriker);
      return {
        id: p.id,
        name: p.name,
        runs: s.runs,
        balls: s.balls,
        fours: s.fours,
        sixes: s.sixes,
        sr: s.balls ? +((s.runs / s.balls) * 100).toFixed(2) : 0,
        onStrike: !inningsCompleted && p.id === currentStriker,
        status: d ? "out" : atCrease ? "batting" : "not-out",
        dismissal: d ? d : null,
      };
    });

  return rows;
}

/* ─── BOWLING ─── */

export function computeBowling(
  balls: Ball[],
  bowlingTeamPlayers: Player[],
  pm: Record<string, Player>
): BowlerRow[] {
  const s: Record<
    string,
    {
      legalBalls: number;
      runs: number;
      wickets: number;
      dots: number;
      extras: number;
      overRunsByOver: Record<number, number>;
      overLegalByOver: Record<number, number>;
    }
  > = {};

  for (const b of balls) {
    const bid = b.bowler;
    if (!bid) continue;
    s[bid] ??= {
      legalBalls: 0,
      runs: 0,
      wickets: 0,
      dots: 0,
      extras: 0,
      overRunsByOver: {},
      overLegalByOver: {},
    };
    const rec = s[bid];
    if (!b.is_wide && !b.is_noball) rec.legalBalls++;
    // Runs conceded includes extras for wides & no-balls; byes/legbyes not tracked separately here.
    rec.runs += b.total_runs;
    if (b.is_wide || b.is_noball) rec.extras += 1 + (b.extra_runs || 0);
    if (b.is_wicket && b.wicket_type !== "RUN_OUT") rec.wickets++;
    if (
      !b.is_wide &&
      !b.is_noball &&
      b.runs_scored === 0 &&
      !b.is_wicket
    )
      rec.dots++;

    rec.overRunsByOver[b.over_number] =
      (rec.overRunsByOver[b.over_number] ?? 0) + b.total_runs;
    if (!b.is_wide && !b.is_noball) {
      rec.overLegalByOver[b.over_number] =
        (rec.overLegalByOver[b.over_number] ?? 0) + 1;
    }
  }

  const firstOver: Record<string, number> = {};
  balls.forEach((b, i) => {
    if (!(b.bowler in firstOver)) firstOver[b.bowler] = i;
  });

  return bowlingTeamPlayers
    .filter((p) => p.id in s)
    .sort((a, b) => firstOver[a.id] - firstOver[b.id])
    .map((p) => {
      const rec = s[p.id];
      const overs = oversDisplay(rec.legalBalls);
      const econ =
        rec.legalBalls > 0 ? +((rec.runs / rec.legalBalls) * 6).toFixed(2) : 0;
      // Maiden = full 6-ball over with 0 runs and no wides/noballs
      let maidens = 0;
      Object.entries(rec.overRunsByOver).forEach(([ov, runs]) => {
        const legal = rec.overLegalByOver[+ov] ?? 0;
        if (legal === 6 && runs === 0) maidens++;
      });
      return {
        id: p.id,
        name: p.name,
        oversText: overs,
        legalBalls: rec.legalBalls,
        maidens,
        runs: rec.runs,
        wickets: rec.wickets,
        econ,
        dots: rec.dots,
        extras: rec.extras,
      };
    });
}

/* ─── FALL OF WICKETS ─── */

export function computeFallOfWickets(
  balls: Ball[],
  pm: Record<string, Player>
): WicketRow[] {
  const rows: WicketRow[] = [];
  let cum = 0;
  let wkt = 0;
  for (const b of balls) {
    cum += b.total_runs;
    if (b.is_wicket) {
      wkt++;
      const who = b.dismissed_player ?? b.striker;
      rows.push({
        wkt,
        playerOut: playerName(who, pm),
        bowler: playerName(b.bowler, pm),
        type: b.wicket_type ?? "OUT",
        overBall: ballLocator(b.ball_number, b.over_number),
        teamScore: `${cum}/${wkt}`,
      });
    }
  }
  return rows;
}

/* ─── COMMENTARY ─── */

export function buildCommentary(
  balls: Ball[],
  pm: Record<string, Player>,
  limit = 14
): CommentaryItem[] {
  const items: CommentaryItem[] = balls.map((b) => {
    const striker = playerName(b.striker, pm);
    const bowler = playerName(b.bowler, pm);
    let tone: CommentaryItem["tone"] = "run";
    let title = `${b.runs_scored} run${b.runs_scored === 1 ? "" : "s"}`;
    let desc = "";

    if (b.is_wicket) {
      tone = "wicket";
      title = "OUT!";
      desc = dismissalText(b, pm);
    } else if (b.runs_scored === 6) {
      tone = "six";
      title = "SIX!";
      desc = "Launched for a maximum.";
    } else if (b.runs_scored === 4 || b.is_boundary) {
      tone = "four";
      title = "FOUR!";
      desc = "Finds the gap — to the rope.";
    } else if (b.is_wide) {
      tone = "extra";
      title = `Wide${b.extra_runs ? ` +${b.extra_runs}` : ""}`;
      desc = "Down the leg side.";
    } else if (b.is_noball) {
      tone = "extra";
      title = `No ball +${1 + b.runs_scored}`;
      desc = "Overstepped.";
    } else if (b.runs_scored === 0) {
      tone = "dot";
      title = "Dot ball";
      desc = "No run.";
    } else {
      desc = `Pushed for a ${b.runs_scored === 1 ? "single" : b.runs_scored === 2 ? "brace" : "trio"}.`;
    }

    return {
      id: b.id,
      overBall: ballLocator(b.ball_number, b.over_number),
      bowler,
      striker,
      title,
      desc,
      tone,
      isBoundary: b.runs_scored === 4 || b.runs_scored === 6,
      isWicket: b.is_wicket,
    };
  });
  return items.reverse().slice(0, limit);
}

/* ─── Current batsmen helper ─── */

export function currentBatters(balls: Ball[]): { strikerId: string | null; nonStrikerId: string | null } {
  const last = balls[balls.length - 1];
  if (!last) return { strikerId: null, nonStrikerId: null };
  return { strikerId: last.striker, nonStrikerId: last.non_striker };
}
