// src/pages/Login.tsx
/**
 * HOSTELOS LOGIN — Premium login panel.
 *
 * Google Sign-In is platform-aware:
 *   - Web:            renders Google Identity Services button (GSI)
 *   - Android / iOS:  renders a custom styled button that triggers native Google Auth
 *
 * Both paths obtain an ID token and exchange it at /api/auth/google-login for a JWT.
 */
import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react'
import { initStoredAuth, getToken, getStoredUser, setToken, setStoredUser, apiAuth } from '../lib/api-client'
import {
  isNativePlatform,
  renderGsiButton,
  initNativeGoogleAuth,
  nativeGoogleSignIn,
  nativeGoogleSignOut,
} from '../lib/google-auth'
import toast from 'react-hot-toast'

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const BASE_URL = envApiUrl.replace(/\/api$/, '')

// ── Google logo SVG (used for the native-platform button) ────────────────────
const GoogleLogoSVG = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
    />
  </svg>
)

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [nativeGoogleReady, setNativeGoogleReady] = useState(false)
  const native = isNativePlatform()
  const gsiMounted = useRef(false)

  // ── Redirect if already logged in ─────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      await initStoredAuth()
      const token = getToken()
      const user = getStoredUser()
      if (token && user) redirectByRole(user.role)
    }
    checkAuth()
  }, [])

  // ── Platform-specific Google Auth initialisation ────────────────────────────
  useEffect(() => {
    if (native) {
      // Android / iOS: initialise the native plugin once
      initNativeGoogleAuth()
        .then(() => setNativeGoogleReady(true))
        .catch((err) => {
          console.error('[Login] Native Google Auth init error:', err)
          setNativeGoogleReady(true) // Still show button; error will surface on tap
        })
    } else {
      // Web: render the GSI button into the dedicated container
      if (gsiMounted.current) return
      gsiMounted.current = true

      renderGsiButton(
        'google-signin-button',
        async ({ idToken }) => {
          setGoogleLoading(true)
          setError('')
          try {
            const data = await apiAuth.googleLogin(idToken)
            toast.success('Welcome back!')
            redirectByRole(data.user.role)
          } catch (err: any) {
            setError(err.message || 'Google Authentication failed.')
            toast.error(err.message || 'Google Authentication failed.')
          } finally {
            setGoogleLoading(false)
          }
        },
        (err) => {
          console.error('[Login] GSI error:', err)
          // GSI button renders itself; only surface critical errors
        }
      )
    }
  }, [native])

  function redirectByRole(role: string) {
    if (role === 'super_admin') window.location.href = '/superadmin/dashboard'
    else if (role === 'admin')   window.location.href = '/admin/dashboard'
    else if (role === 'student') window.location.href = '/student/dashboard'
    else window.location.href = '/login'
  }

  // ── Native Google Sign-In button handler ──────────────────────────────────
  const handleNativeGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      // Attempt sign-out first to clear any cached account, allowing account picker to show
      await nativeGoogleSignOut().catch(() => {})

      const { idToken } = await nativeGoogleSignIn()
      const data = await apiAuth.googleLogin(idToken)
      toast.success('Welcome back!')
      redirectByRole(data.user.role)
    } catch (err: any) {
      const msg = err.message || 'Google Authentication failed.'
      // Suppress user-cancelled errors silently
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('12501')) {
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── Email / Password login ────────────────────────────────────────────────
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

      if (!res.ok) throw new Error(data.error || data.message || 'Login failed')
      if (!data.token || !data.user) throw new Error('Invalid response from server')

      await setToken(data.token)
      await setStoredUser(data.user)
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
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">HostelOS</h1>
            <p className="text-slate-400 mt-1 text-xs text-center">Smart Hostel Management Platform</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-300 font-bold leading-normal">{error}</p>
            </div>
          )}

          {/* Email / Password Form */}
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Or Continue With
            </span>
          </div>

          {/* Google Sign-In — platform aware */}
          <div className="flex justify-center mb-2">
            {native ? (
              /* ── Native Android / iOS button ── */
              <button
                id="google-signin-button-native"
                type="button"
                onClick={handleNativeGoogleSignIn}
                disabled={googleLoading || !nativeGoogleReady}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold text-sm rounded-xl px-4 py-3 transition-all shadow-md shadow-black/10 border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Sign in with Google"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <GoogleLogoSVG />
                )}
                <span>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </span>
              </button>
            ) : (
              /* ── Web GSI rendered button container ── */
              <div
                id="google-signin-button"
                className="w-full flex justify-center"
                aria-label="Sign in with Google"
              />
            )}
          </div>

          {/* Dev credentials hint */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                Default Credentials (Dev Mode)
              </p>
              <p className="text-[11px] text-slate-300 font-mono">Email: admin@hostel.com</p>
              <p className="text-[11px] text-slate-300 font-mono">Password: Bhanu@2006</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login