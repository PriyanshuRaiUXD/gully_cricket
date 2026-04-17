import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { 
  Trophy, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  Star, 
  Shield, 
  Lock, 
  Cpu,
  Globe,
  Fingerprint
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  
  const setTokens = useAuthStore((s) => s.setTokens)
  const navigate = useNavigate()

  useEffect(() => {
    // Subtle "handshake" animation effect on load
    const timer = setTimeout(() => setIsSecure(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/login/', { email, password })
      setTokens(res.data.access, res.data.refresh)
      toast.success('Authentication successful. Welcome, Captain.')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unauthorized. Please check your credentials.')
      toast.error('Access Denied')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05060B] text-white flex overflow-hidden selection:bg-neon-cyan/30">
      {/* ─── LEFT PANEL: Cinematic Brand ─── */}
      <div className="hidden lg:flex flex-[1.2] relative items-center justify-center p-16 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 mesh-hero opacity-100" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-grid-dark bg-grid-32 opacity-20" />
        
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-neon-violet/10 blur-[120px] rounded-full animate-pulse delay-700" />

        <div className="relative z-10 max-w-xl space-y-10 animate-rise">
          <Link to="/" className="inline-flex items-center gap-4 mb-16 group">
             <div className="w-14 h-14 rounded-2xl bg-white text-ink-950 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Trophy className="w-7 h-7" strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
                <span className="font-display font-black text-2xl tracking-tighter uppercase leading-none">Gully Cricket</span>
                <span className="text-[10px] text-neon-cyan font-black tracking-[.4em] uppercase mt-1">Pro Terminal</span>
             </div>
          </Link>

          <h2 className="text-7xl xl:text-8xl font-display font-black leading-[0.8] tracking-tighter">
            THE STAGE <br />
            IS <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-violet">YOURS</span> <br />
            TO COMMAND.
          </h2>
          
          <p className="text-ink-300 text-xl font-display leading-relaxed max-w-md">
            The most powerful tournament management engine ever built for the local streets. 
          </p>

          <div className="space-y-6 pt-10">
             <div className="flex items-center gap-4 text-xs font-black tracking-widest text-ink-500 uppercase">
                <div className="h-px w-12 bg-white/10" />
                Terminal Capabilities
             </div>
             <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Cpu className="w-4 h-4" />, label: "Live Engine" },
                  { icon: <Globe className="w-4 h-4" />, label: "Global Sync" },
                  { icon: <Fingerprint className="w-4 h-4" />, label: "Biometric ID" },
                  { icon: <Shield className="w-4 h-4" />, label: "Encrypted" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition">
                     <div className="text-neon-cyan">{item.icon}</div>
                     <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Auth Form ─── */}
      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-[#080910]">
        <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-[0.03]" />
        
        <div className="relative z-10 w-full max-w-[460px] mx-auto">
          {/* Header */}
          <div className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-neon-cyan font-display font-bold text-[10px] uppercase tracking-[.4em] mb-4">
                 <span className={`w-2 h-2 rounded-full ${isSecure ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                 {isSecure ? 'Secure Link Established' : 'Connecting...'}
              </div>
              <h1 className="text-5xl font-black font-display text-white tracking-tighter">Login</h1>
            </div>
            <Link
              to="/"
              className="group flex items-center gap-2 text-[10px] text-ink-500 hover:text-white transition uppercase tracking-[.2em] font-black pb-2"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Public
            </Link>
          </div>

          <div className="animate-rise [animation-delay:200ms]">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-center animate-shake">
                   Error: {error}
                </div>
              )}
              
              <div className="space-y-6">
                <div className="group relative">
                  <Input
                    label="Access Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="organizer@terminal.pro"
                    autoFocus
                    autoComplete="email"
                    className="h-16 bg-white/[0.02] border-white/10 rounded-2xl px-6 focus:border-neon-cyan/50 focus:ring-neon-cyan/5 text-lg transition-all"
                  />
                  <div className="absolute right-5 top-[52px] text-ink-600 group-focus-within:text-neon-cyan transition-colors">
                     <Lock className="w-4 h-4" />
                  </div>
                </div>

                <div className="group relative">
                  <Input
                    label="Passkey"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="h-16 bg-white/[0.02] border-white/10 rounded-2xl px-6 focus:border-neon-cyan/50 focus:ring-neon-cyan/5 text-lg transition-all"
                  />
                  <div className="absolute right-5 top-[52px] text-ink-600 group-focus-within:text-neon-cyan transition-colors">
                     <Zap className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                       <input type="checkbox" className="peer sr-only" />
                       <div className="w-5 h-5 rounded-lg border-2 border-white/10 peer-checked:bg-neon-cyan peer-checked:border-neon-cyan transition-all" />
                       <CheckCircle2 className="absolute inset-0 w-5 h-5 text-ink-950 scale-0 peer-checked:scale-75 transition-transform" />
                    </div>
                    <span className="text-[11px] font-bold text-ink-500 group-hover:text-ink-300 transition uppercase tracking-wider">Remember Terminal</span>
                 </label>
                 <Link to="#" className="text-[11px] text-neon-cyan font-black hover:text-white transition uppercase tracking-wider">Recovery</Link>
              </div>

              <Button 
                type="submit" 
                loading={loading} 
                className="w-full h-18 rounded-[2rem] text-[13px] font-black uppercase tracking-[.3em] shadow-[0_20px_40px_-15px_rgba(0,229,255,0.3)] bg-white text-ink-950 hover:bg-neon-cyan hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                {loading ? 'Authenticating...' : (
                  <span className="flex items-center justify-center gap-3">
                    <ShieldCheck className="w-5 h-5" />
                    Initialize Access
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-16 text-center space-y-8">
               <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center"><span className="bg-[#080910] px-6 text-[10px] text-ink-700 uppercase tracking-[.4em] font-black">Authorized Personnel Only</span></div>
               </div>

               <p className="text-ink-500 text-sm font-medium">
                New to the platform? <br />
                <Link to="/register" className="inline-flex items-center gap-2 mt-4 text-white font-black hover:text-neon-cyan transition-colors group">
                  <Star className="w-4 h-4 text-neon-amber group-hover:rotate-90 transition-transform" />
                  REQUEST ORGANIZER ACCESS
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-16 flex justify-between items-center text-[9px] text-ink-800 font-black uppercase tracking-[.4em]">
           <span>&copy; 2026 GULLY_CRICKET_SYSTEMS</span>
           <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              Node: IND-DEL-01
           </span>
        </div>
      </div>
    </div>
  )
}

function CheckCircle2({ className }: { className: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
