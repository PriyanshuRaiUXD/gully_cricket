// Deterministic per-team visuals: color pair + monogram initials.
// Used across homepage, match cards, and the live match view.

const PALETTE: { from: string; to: string; ring: string }[] = [
  { from: "#FF3B47", to: "#FF8A47", ring: "rgba(255,59,71,.35)" },    // crimson
  { from: "#00E5FF", to: "#0099FF", ring: "rgba(0,229,255,.35)" },    // cyan
  { from: "#FFB020", to: "#FF7A00", ring: "rgba(255,176,32,.35)" },   // amber
  { from: "#8B5CF6", to: "#5B3BE0", ring: "rgba(139,92,246,.35)" },   // violet
  { from: "#10B981", to: "#047857", ring: "rgba(16,185,129,.35)" },   // emerald
  { from: "#FF4FB6", to: "#D130A1", ring: "rgba(255,79,182,.35)" },   // pink
  { from: "#38BDF8", to: "#0284C7", ring: "rgba(56,189,248,.35)" },   // sky
  { from: "#B8F332", to: "#6EB000", ring: "rgba(184,243,50,.35)" },   // lime
  { from: "#F97316", to: "#C2410C", ring: "rgba(249,115,22,.35)" },   // orange
  { from: "#F43F5E", to: "#9F1239", ring: "rgba(244,63,94,.35)" },    // rose
];

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

export function teamColor(name: string | undefined) {
  if (!name) return PALETTE[0];
  return PALETTE[hash(name) % PALETTE.length];
}

export function teamInitials(name: string | undefined) {
  if (!name) return "??";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] ?? "";
  return (w[0] ?? "?").toUpperCase() + (w[1] ?? "").toUpperCase();
}
