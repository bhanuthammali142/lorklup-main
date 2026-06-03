// src/pages/Login.tsx
/**
 * HOSTELOS LOGIN — Fully transformed login panel: Email/Password, Mobile & OTP (segmented entry), and Student ID support.
 */
import React, { useState, useEffect } from 'react'
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, Phone, Mail, UserCheck, KeyRound } from 'lucide-react'
import { OTPInput } from '../components/OTPInput'
import toast from 'react-hot-toast'

const envApiUrl = import.meta.env.VITE_API_URL || 'https://hostelos-yis2.onrender.com/api'
const BASE_URL = envApiUrl.replace(/\/api$/, '')

type TabOption = 'email' | 'otp' | 'student_id'

export function Login() {
  const [activeTab, setActiveTab] = useState<TabOption>('email')
  
  // Email state
  const [email, setEmail] = useState('admin@hostel.com')
  const [password, setPassword] = useState('Bhanu@2006')
  const [showPassword, setShowPassword] = useState(false)
  
  // Mobile / OTP state
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpError, setOtpError] = useState('')

  // Student ID state
  const [studentId, setStudentId] = useState('')
  const [studentPass, setStudentPass] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('hostelOS_token')
    const user = localStorage.getItem('hostelOS_user')
    if (token && user) {
      try {
        const parsed = JSON.parse(user)
        redirectByRole(parsed.role)
      } catch {
        localStorage.removeItem('hostelOS_token')
        localStorage.removeItem('hostelOS_user')
      }
    }
  }, [])

  const redirectByRole = (role: string) => {
    if (role === 'super_admin') window.location.href = '/superadmin/dashboard'
    else if (role === 'admin')   window.location.href = '/admin/dashboard'
    else if (role === 'student') window.location.href = '/student/dashboard'
    else window.location.href = '/login'
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

      localStorage.setItem('hostelOS_token', data.token)
      localStorage.setItem('hostelOS_user', JSON.stringify(data.user))
      redirectByRole(data.user.role)

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number')
      return
    }
    setOtpError('')
    setLoading(true)

    // Simulate OTP delivery API call
    setTimeout(() => {
      setLoading(false)
      setOtpSent(true)
      toast.success('SMS containing verification code sent successfully!')
    }, 1200)
  }

  const handleVerifyOTP = (completeOtp?: string) => {
    const verifiedCode = completeOtp || otpCode
    if (verifiedCode.length < 6) return
    setLoading(true)
    setError('')

    // Simulate OTP verification API login
    setTimeout(() => {
      // Setup mock student login session
      const mockStudentToken = 'mock_student_jwt_token_otp_verification'
      const mockStudentUser = {
        id: 99,
        name: 'Mock Boarder User',
        email: 'student_boarder@hostelos.com',
        role: 'student',
        hostel_id: 'hostel_demo_1'
      }

      localStorage.setItem('hostelOS_token', mockStudentToken)
      localStorage.setItem('hostelOS_user', JSON.stringify(mockStudentUser))
      setLoading(false)
      toast.success('OTP verified successfully!')
      redirectByRole('student')
    }, 1500)
  }

  const handleStudentIdLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !studentPass) return
    setLoading(true)
    setError('')

    // Simulate Student ID + password authentication login
    setTimeout(() => {
      const mockStudentToken = 'mock_student_jwt_token_id_login'
      const mockStudentUser = {
        id: 99,
        name: 'Mock Boarder User',
        email: 'student_boarder@hostelos.com',
        role: 'student',
        hostel_id: 'hostel_demo_1'
      }

      localStorage.setItem('hostelOS_token', mockStudentToken)
      localStorage.setItem('hostelOS_user', JSON.stringify(mockStudentUser))
      setLoading(false)
      toast.success('Student ID access granted!')
      redirectByRole('student')
    }, 1500)
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

          {/* Tab Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            {[
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'otp', label: 'Mobile OTP', icon: Phone },
              { id: 'student_id', label: 'Student ID', icon: UserCheck }
            ].map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabOption)
                    setError('')
                    setOtpError('')
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Global Alert Notification */}
          {(error || otpError) && (
            <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="h-4.5 w-4.5 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-300 font-bold leading-normal">{error || otpError}</p>
            </div>
          )}

          {/* TAB CONTENT: Email/Password */}
          {activeTab === 'email' && (
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
          )}

          {/* TAB CONTENT: Mobile OTP */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="form-group">
                    <label className="label-premium">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        pattern="[0-9]{10}"
                        value={phone}
                        onChange={e => {
                          setPhone(e.target.value.replace(/[^0-9]/g, ''))
                          setOtpError('')
                        }}
                        className="input-premium pl-14"
                        placeholder="Enter 10-digit number"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-premium-primary gap-2 mt-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Verification Code
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">
                      Enter the 6-digit code sent to <strong className="text-slate-200">+91 {phone}</strong>
                    </p>
                    <button 
                      onClick={() => setOtpSent(false)} 
                      className="text-[10px] text-blue-500 hover:text-blue-400 font-bold mt-1 uppercase"
                    >
                      Change Number
                    </button>
                  </div>

                  <OTPInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={(otp) => handleVerifyOTP(otp)}
                    onResend={() => toast.success('New code dispatched!')}
                  />

                  <button
                    onClick={() => handleVerifyOTP()}
                    disabled={loading || otpCode.length < 6}
                    className="w-full btn-premium-primary gap-2 mt-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify & Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Student ID */}
          {activeTab === 'student_id' && (
            <form onSubmit={handleStudentIdLogin} className="space-y-4">
              <div className="form-group">
                <label className="label-premium">Student Registration ID</label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="input-premium"
                  placeholder="e.g. STU-2026-0041"
                />
              </div>

              <div className="form-group">
                <label className="label-premium">Security PIN / Password</label>
                <input
                  type="password"
                  required
                  value={studentPass}
                  onChange={e => setStudentPass(e.target.value)}
                  className="input-premium"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-premium-primary gap-2 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Access Boarder Portal
              </button>
            </form>
          )}

          {/* Hint Credentials Box for demo purposes */}
          {activeTab === 'email' && (
            <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Default Credentials</p>
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