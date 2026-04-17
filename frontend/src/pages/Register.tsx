import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

import { ShieldCheck, ArrowLeft, Trophy } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register/', form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      const data = err.response?.data
      if (data) setError(Object.values(data).flat().join(' '))
      else setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white relative overflow-hidden flex items-center justify-center p-4 selection:bg-neon-cyan/30">
      {/* Mesh background */}
      <div className="absolute inset-0 mesh-hero opacity-60" />
      <div className="absolute inset-0 bg-grid-dark bg-grid-28 opacity-[.15]" />
      
      <div className="relative w-full max-w-[420px] animate-rise">
        <Link
          to="/login"
          className="group inline-flex items-center gap-2 text-[10px] text-ink-500 hover:text-white transition uppercase tracking-[.25em] font-black mb-10 bg-white/5 px-4 py-2 rounded-full border border-white/5"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          Back to login
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 rounded-[2rem] bg-gradient-to-br from-neon-violet to-purple-600 items-center justify-center shadow-glow-violet mb-8 relative">
            <Trophy className="w-10 h-10 text-ink-950" strokeWidth={2.5} />
            <div className="absolute -inset-1 bg-white/20 blur-xl rounded-full opacity-50" />
          </div>
          <h1 className="text-4xl font-black font-display text-white tracking-tighter">Get Started</h1>
          <p className="text-ink-500 text-sm mt-3 font-medium">Join the elite network of gully cricket organizers.</p>
        </div>

        <div className="glass-strong rounded-[2.5rem] border border-white/[.08] shadow-2xl p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[.02] to-transparent pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] px-4 py-3 rounded-xl font-bold uppercase tracking-wide text-center animate-shake">
                {error}
              </div>
            )}
            
            <Input
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="cricket_master"
              autoFocus
              autoComplete="username"
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[.2em] shadow-glow-violet mt-2 bg-gradient-to-r from-neon-violet to-purple-600 border-none text-white hover:opacity-90" size="lg">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-500 mt-10 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-neon-violet font-bold hover:text-white transition decoration-neon-violet/30 underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
