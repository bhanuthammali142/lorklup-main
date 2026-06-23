import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { apiAuth, setToken, setStoredUser } from '../lib/api-client'
import toast from 'react-hot-toast'
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'

export function AuthPage() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Role-based redirect once authenticated
  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'super_admin') navigate('/superadmin/dashboard', { replace: true })
      else if (role === 'admin')  navigate('/admin/dashboard',      { replace: true })
      else if (role === 'student') navigate('/student/dashboard',   { replace: true })
    }
  }, [user, role, loading, navigate])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (isLogin) {
        const { token, user: loggedIn } = await apiAuth.login(email, password)
        await setToken(token)
        await setStoredUser(loggedIn)
        toast.success('Welcome back!')
        // Redirect via useEffect once state updates
        window.location.href = loggedIn.role === 'super_admin'
          ? '/superadmin/dashboard'
          : loggedIn.role === 'admin'
          ? '/admin/dashboard'
          : '/student/dashboard'
      } else {
        if (!name.trim()) { toast.error('Name is required'); setIsSubmitting(false); return }
        const { token, user: created } = await apiAuth.register(name, email, password)
        await setToken(token)
        await setStoredUser(created)
        toast.success('Admin account created! Setting up your dashboard...')
        window.location.href = '/admin/dashboard'
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/10 border border-white/60 p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">HostelOS</h1>
            <p className="text-slate-500 mt-1.5 text-sm text-center leading-relaxed">
              {isLogin ? 'Sign in to continue to your dashboard' : 'Create your hostel admin account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-4 py-3.5 text-sm font-bold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-60 flex justify-center items-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Students: Sign in using the credentials provided by your hostel administrator.
              You will be automatically redirected to your student dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
