/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy ICC tokens (kept for admin pages that still use them)
        icc: {
          950: "#020B18",
          900: "#061425",
          800: "#0A1E3C",
          700: "#0D2755",
          600: "#1A3A6B",
          500: "#1E50A2",
          sky:  "#009EE0",
          gold: "#C49A2C",
        },
        // New world-class design tokens
        ink: {
          950: "#05060A",  // deepest canvas
          900: "#0A0B12",  // primary bg
          850: "#0E1018",  // sub-surface
          800: "#141622",  // elevated panel
          750: "#1A1D2B",  // hover surface
          700: "#242837",  // border / divider
          600: "#383D50",  // muted text
          500: "#5B617A",  // secondary text
          400: "#8A90A5",
          300: "#B3B8CB",
          200: "#D5D9E4",
          100: "#EBEEF5",
          50:  "#F6F7FB",
        },
        neon: {
          cyan: "#00E5FF",
          cyanDim: "#00B8D4",
          amber: "#FFB020",
          amberDim: "#D99015",
          lime: "#B8F332",
          pink: "#FF4FB6",
          violet: "#8B5CF6",
        },
        live: {
          DEFAULT: "#FF3B47",
          glow: "#FF6B74",
          deep: "#C4282F",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 0 1px rgba(0,229,255,.25), 0 8px 32px -8px rgba(0,229,255,.35)',
        'glow-live': '0 0 0 1px rgba(255,59,71,.35), 0 0 28px rgba(255,59,71,.35)',
        'glow-amber': '0 0 0 1px rgba(255,176,32,.3), 0 10px 30px -8px rgba(255,176,32,.3)',
        'panel': '0 1px 0 0 rgba(255,255,255,.04) inset, 0 20px 60px -20px rgba(0,0,0,.6)',
        'panel-hover': '0 1px 0 0 rgba(255,255,255,.08) inset, 0 30px 80px -20px rgba(0,0,0,.7)',
        'pop': '0 10px 40px -10px rgba(0,0,0,.5)',
      },
      backgroundImage: {
        'grid-dark':
          'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
        'radial-spot':
          'radial-gradient(ellipse at top, rgba(0,229,255,.15), transparent 55%)',
        'noise':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.5'/></svg>\")",
      },
      backgroundSize: {
        'grid-28': '28px 28px',
      },
      keyframes: {
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeInSlow: { from: { opacity: '0' }, to: { opacity: '1' } },
        livePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,59,71,.7)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,59,71,0)', transform: 'scale(1.05)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '.45' }, '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(20px) scale(.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        ticker: 'ticker 28s linear infinite',
        fadeIn: 'fadeIn .35s ease-out',
        fadeInSlow: 'fadeInSlow .6s ease-out',
        livePulse: 'livePulse 1.8s ease-out infinite',
        glowPulse: 'glowPulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        rise: 'rise .5s cubic-bezier(.2,.9,.3,1.1) both',
        floaty: 'floaty 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
