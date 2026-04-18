import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { useGoogleOneTapLogin, useGoogleLogin } from '@react-oauth/google'
import { 
  Trophy, 
  ArrowLeft, 
  UserPlus,
  AlertCircle
} from 'lucide-react'

/* --- Refined Social Icons --- */
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

const AppleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 384 512">
    <path fill="white" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-31.4-97.3-8.3-97.7-91.8zM229.1 88c26.5-32.3 25.9-60.9 25.2-77.1-23.7 2.1-51.4 17.7-65.4 34.6-13.3 15.6-26.1 43.1-22 71.3 28.3 2.1 50.1-15.1 62.2-28.8z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const MicrosoftIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23">
    <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M13 1h10v10H13z"/><path fill="#05a6f0" d="M1 13h10v10H1z"/><path fill="#ffba08" d="M13 13h10v10H13z"/>
  </svg>
)

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  
  const setTokens = useAuthStore((s) => s.setTokens)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setIsSecure(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleSocialSuccess = async (provider: string, token: string) => {
    setLoading(true)
    const loadId = toast.loading(`Initializing ${provider} protocols...`)
    try {
      const res = await api.post('/auth/social-login/', { provider, token })
      setTokens(res.data.access, res.data.refresh)
      toast.success('Commander initialized.', { id: loadId })
      navigate('/dashboard')
    } catch (err: any) {
      toast.error('Initialization failed.', { id: loadId })
    } finally {
      setLoading(false)
    }
  }

  // Determine if Google ID is placeholder
  const isGoogleConfigured = !window.location.href.includes('YOUR_GOOGLE_CLIENT_ID_HERE');

  // Google Click Login
  const registerWithGoogle = useGoogleLogin({
    onSuccess: (res) => handleSocialSuccess('google', res.access_token),
    onError: () => toast.error('Google registration failed'),
  })

  // Google One Tap
  useGoogleOneTapLogin({
    onSuccess: (res) => handleSocialSuccess('google', res.credential || ''),
    onError: () => console.log('One Tap check'),
    disabled: !isGoogleConfigured
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Min. 8 characters required.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register/', form)
      toast.success('Commander account initialized.')
      navigate('/login')
    } catch (err: any) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialBtnClick = (provider: string) => {
    if (provider === 'google') {
       if (!isGoogleConfigured) {
          toast.error('Google Auth not configured in main.tsx')
          return
       }
       registerWithGoogle()
    } else {
       toast(`${provider.toUpperCase()} flow initiated. Configuration required.`, {
         icon: <AlertCircle className="text-amber-500 w-5 h-5" />
       })
    }
  }

  return (
    <div className="min-h-screen bg-[#05060B] text-white flex overflow-hidden selection:bg-neon-cyan/30 font-display">
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex flex-[1.2] relative items-center justify-center p-16 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 mesh-hero opacity-100" />
        <div className="relative z-10 max-w-xl space-y-10 animate-rise">
          <Link to="/" className="inline-flex items-center gap-4 mb-16 group">
             <div className="w-14 h-14 rounded-2xl bg-white text-ink-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7" strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter uppercase leading-none">Gully Cricket</span>
                <span className="text-[10px] text-neon-cyan font-black tracking-[.4em] uppercase mt-1">Pro Terminal</span>
             </div>
          </Link>
          <h2 className="text-7xl xl:text-8xl font-black leading-[0.8] tracking-tighter">
            JOIN THE <br />
            ELITE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-violet via-white to-neon-cyan">MASTERS</span>.
          </h2>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-[#080910] overflow-y-auto">
        <div className="absolute inset-0 bg-grid-dark bg-grid-24 opacity-[0.03]" />
        <div className="relative z-10 w-full max-w-[480px] mx-auto py-12 text-center">
          <div className="mb-12 flex justify-between items-end border-b border-white/5 pb-8">
            <div className="text-left">
              <div className="flex items-center gap-2 text-neon-cyan font-bold text-[10px] uppercase tracking-[.4em] mb-4">
                 <span className={`w-2 h-2 rounded-full ${isSecure ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                 {isSecure ? 'Secure Link Active' : 'Connecting...'}
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Sign Up</h1>
            </div>
            <Link to="/" className="group flex items-center gap-2 text-[10px] text-ink-500 hover:text-white transition uppercase tracking-[.2em] font-black pb-2">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Public
            </Link>
          </div>

          <div className="animate-rise [animation-delay:200ms]">
            <div className="grid grid-cols-2 gap-4 mb-10">
               <button onClick={() => handleSocialBtnClick('google')} className="flex items-center justify-center gap-4 h-16 px-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all font-bold text-[11px] uppercase tracking-widest group">
                  <GoogleIcon /> <span className="text-ink-300 group-hover:text-white transition">Google</span>
               </button>
               <button onClick={() => handleSocialBtnClick('apple')} className="flex items-center justify-center gap-4 h-16 px-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all font-bold text-[11px] uppercase tracking-widest group">
                  <AppleIcon /> <span className="text-ink-300 group-hover:text-white transition">Apple</span>
               </button>
               <button onClick={() => handleSocialBtnClick('microsoft')} className="flex items-center justify-center gap-4 h-16 px-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all font-bold text-[11px] uppercase tracking-widest group">
                  <MicrosoftIcon /> <span className="text-ink-300 group-hover:text-white transition">Microsoft</span>
               </button>
               <button onClick={() => handleSocialBtnClick('facebook')} className="flex items-center justify-center gap-4 h-16 px-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all font-bold text-[11px] uppercase tracking-widest group">
                  <FacebookIcon /> <span className="text-ink-300 group-hover:text-white transition">Facebook</span>
               </button>
            </div>

            <div className="relative mb-10">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
               <div className="relative flex justify-center"><span className="bg-[#080910] px-6 text-[10px] text-ink-700 uppercase tracking-[.4em] font-black italic">Protocol Encryption Active</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-6">
                <Input label="Commander Name" name="username" value={form.username} onChange={handleChange} required placeholder="cricket_master" className="h-16" />
                <Input label="Communications Email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@terminal.pro" className="h-16" />
                <Input label="Secure Passkey" type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••••••" className="h-16" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button type="submit" loading={loading} className="flex-1 h-16 rounded-[2rem] text-[13px] font-black uppercase tracking-[.3em] bg-white text-ink-950 hover:bg-neon-violet hover:text-white border-none transition-all shadow-glow-white hover:shadow-glow-violet">
                  <UserPlus className="w-5 h-5 mr-3" /> Initialize
                </Button>
                <Link to="/login" className="flex-1 h-16 rounded-[2rem] text-[13px] font-black uppercase tracking-[.3em] flex items-center justify-center border border-white/10 hover:bg-white/5 text-white transition-all">
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
