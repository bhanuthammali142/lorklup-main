// src/pages/Login.tsx
/**
 * HOSTELOS LOGIN — Premium login panel using Email and Password authentication.
 */
import React, { useState, useEffect } from 'react'
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react'
import { initStoredAuth, getToken, getStoredUser, setToken, setStoredUser, apiAuth } from '../lib/api-client'
import toast from 'react-hot-toast'

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const BASE_URL = envApiUrl.replace(/\/api$/, '')

export function Login() {
  // Email state
  const [email, setEmail] = useState('admin@hostel.com')
  const [password, setPassword] = useState('Bhanu@2006')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      await initStoredAuth()
      const token = getToken()
      const user = getStoredUser()
      if (token && user) {
        redirectByRole(user.role)
      }
    }
    checkAuth()

    // Dynamically load Google GSI script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com'
        if ((window as any).google) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'filled_blue',
              size: 'large',
              width: 380,
              text: 'continue_with',
              shape: 'rectangular',
            }
          );
        }
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err)
      }
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const redirectByRole = (role: string) => {
    if (role === 'super_admin') window.location.href = '/superadmin/dashboard'
    else if (role === 'admin')   window.location.href = '/admin/dashboard'
    else if (role === 'student') window.location.href = '/student/dashboard'
    else window.location.href = '/login'
  }

  const handleGoogleCallback = async (response: any) => {
    setError('')
    setLoading(true)

    try {
      const data = await apiAuth.googleLogin(response.credential)
      toast.success('Welcome back!')
      redirectByRole(data.user.role)
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Login failed')
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response from server')
      }

      setToken(data.token)
      setStoredUser(data.user)
      redirectByRole(data.user.role)

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden p-4">
      {/* Dynamic background lights */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="h-13 w-13 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-6.5 w-6.5 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">HostelOS</h1>
            <p className="text-slate-400 mt-1 text-xs text-center">Smart Hostel Management Platform</p>
          </div>

          {/* Global Alert Notification */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="h-4.5 w-4.5 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-300 font-bold leading-normal">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="form-group">
              <label className="label-premium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="input-premium"
                placeholder="admin@hostel.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="label-premium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="input-premium pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-premium-primary gap-2 mt-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative bg-[#0f172a] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Or Continue With</span>
          </div>

          {/* Google Button */}
          <div className="flex justify-center mb-2">
            <div id="google-signin-button" className="w-full flex justify-center"></div>
          </div>

          {/* Hint Credentials Box for demo purposes */}
          <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Default Credentials</p>
            <p className="text-[11px] text-slate-300 font-mono">Email: admin@hostel.com</p>
            <p className="text-[11px] text-slate-300 font-mono">Password: Bhanu@2006</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Login