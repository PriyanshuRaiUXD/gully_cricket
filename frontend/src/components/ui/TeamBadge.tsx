import { teamColor, teamInitials } from "../../lib/teamVisual";

interface TeamBadgeProps {
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}

const SIZES = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl md:w-28 md:h-28 md:text-3xl",
};

export function TeamBadge({ name, size = "md", ring = false }: TeamBadgeProps) {
  const c = teamColor(name);
  const initials = teamInitials(name);
  return (
    <div
      className={`${SIZES[size]} relative shrink-0 rounded-2xl flex items-center justify-center font-black tracking-tight text-white font-display`}
      style={{
        background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`,
        boxShadow: ring
          ? `0 0 0 2px rgba(255,255,255,.08), 0 10px 24px -10px ${c.ring}`
          : `0 6px 20px -8px ${c.ring}`,
      }}
    >
      <span className="drop-shadow-[0_1px_0_rgba(0,0,0,.35)]">{initials}</span>
      <span
        className="absolute inset-0 rounded-2xl opacity-50 mix-blend-overlay"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,.45), transparent 55%)",
        }}
      />
    </div>
  );
}
