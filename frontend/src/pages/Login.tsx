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
  Terminal
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  
  const setTokens = useAuthStore((s) => s.setTokens)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setIsSecure(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login/', { email, password })
      setTokens(res.data.access, res.data.refresh)
      toast.success('Access authorized.')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error('Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
    setTokens('demo-access', 'demo-refresh')
    toast.success('Developer Bypass Active')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#05060B] text-white flex overflow-hidden font-display">
      <div className="hidden lg:flex flex-[1.2] relative items-center justify-center p-16 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 mesh-hero opacity-100" />
        <div className="relative z-10 max-w-xl space-y-10">
          <Link to="/" className="inline-flex items-center gap-4 mb-16">
             <div className="w-14 h-14 rounded-2xl bg-white text-ink-950 flex items-center justify-center">
                <Trophy className="w-7 h-7" />
             </div>
             <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter uppercase leading-none">Gully Cricket</span>
                <span className="text-[10px] text-neon-cyan font-black tracking-[.4em] uppercase mt-1">Pro Terminal</span>
             </div>
          </Link>
          <h2 className="text-7xl xl:text-8xl font-black leading-[0.8] tracking-tighter uppercase">
            The Stage <br /> Is Yours.
          </h2>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-[#080910] overflow-y-auto">
        <div className="relative z-10 w-full max-w-[480px] mx-auto">
          <div className="mb-12 flex justify-between items-end border-b border-white/5 pb-8">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Login</h1>
            <Link to="/" className="text-[10px] text-ink-500 hover:text-white uppercase tracking-[.2em] font-black">
              Public Home
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="organizer@terminal.pro" className="h-16" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••••" className="h-16" />
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button type="submit" loading={loading} className="flex-1 h-16 rounded-2xl bg-white text-ink-950 hover:bg-neon-cyan">
                <ShieldCheck className="w-5 h-5 mr-3" /> Initialize
              </Button>
              <Link to="/register" className="flex-1 h-16 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all">
                Sign Up
              </Link>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
             <button onClick={handleDemoAccess} className="inline-flex items-center gap-3 px-8 py-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan hover:text-ink-950 transition-all">
                <Terminal className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[.3em]">Developer Bypass Access</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
