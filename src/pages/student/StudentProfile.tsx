import React from 'react'
import { User, LogOut, FileText, Phone, Building, Bed, GraduationCap, Calendar, Hash, Mail, Shield, Eye, EyeOff, CheckCircle2, Loader2, Key, X } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { apiAuth } from '../../lib/api-client'
import toast from 'react-hot-toast'

function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition">
      <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

export function StudentProfile() {
  const { studentData, signOut, user } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  const [googleStatus, setGoogleStatus] = React.useState<{ isLinked: boolean; googleLinkedAt: string | null; authProvider: string; activities: any[] } | null>(null);
  const [fetchingGoogleStatus, setFetchingGoogleStatus] = React.useState(false);
  const [savingGoogle, setSavingGoogle] = React.useState(false);

  const loadGoogleStatus = async () => {
    if (user) {
      setFetchingGoogleStatus(true);
      try {
        const res = await apiAuth.googleStatus();
        setGoogleStatus(res);
      } catch (err: any) {
        console.error('Failed to load Google status:', err);
      } finally {
        setFetchingGoogleStatus(false);
      }
    }
  };

  React.useEffect(() => {
    loadGoogleStatus();
  }, [user]);

  const handleUnlinkGoogle = async () => {
    if (!confirm('Are you sure you want to unlink your Google Account?')) return;
    setSavingGoogle(true);
    try {
      await apiAuth.unlinkGoogle();
      toast.success('Google account unlinked successfully!');
      loadGoogleStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink Google account.');
    } finally {
      setSavingGoogle(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out from all devices? This will invalidate all your current active sessions.')) return;
    setSavingGoogle(true);
    try {
      await apiAuth.logoutAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to logout from all devices.');
    } finally {
      setSavingGoogle(false);
    }
  };

  React.useEffect(() => {
    let script: HTMLScriptElement | null = null;

    if (googleStatus && !googleStatus.isLinked) {
      const renderLinkButton = () => {
        if ((window as any).google && document.getElementById('google-link-button')) {
          (window as any).google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
            callback: async (response: any) => {
              setSavingGoogle(true);
              try {
                await apiAuth.linkGoogle(response.credential);
                toast.success('Google account linked successfully!');
                loadGoogleStatus();
              } catch (err: any) {
                toast.error(err.message || 'Failed to link Google account.');
              } finally {
                setSavingGoogle(false);
              }
            }
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-link-button'),
            { theme: 'outline', size: 'medium', text: 'signup_with' }
          );
        }
      };

      if (!(window as any).google) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = renderLinkButton;
        document.body.appendChild(script);
      } else {
        setTimeout(renderLinkButton, 100);
      }
    }

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleStatus]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters')
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match')
    }

    setSavingPassword(true)
    try {
      const { apiAuth } = await import('../../lib/api-client')
      await apiAuth.changePassword(newPassword)
      toast.success('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!studentData) return null

  const maskedAadhaar = studentData.aadhaar_number
    ? `XXXX XXXX ${studentData.aadhaar_number.slice(-4)}`
    : null

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="h-8 w-8 text-blue-500" /> My Profile
        </h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Your personal details and hostel information.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-5">
            {studentData.profile_photo ? (
              <img src={studentData.profile_photo} alt="Profile" className="h-20 w-20 rounded-2xl border-4 border-slate-700 object-cover shadow-xl" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-slate-700 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                {studentData.full_name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-white">{studentData.full_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 rounded-full px-2.5 py-1">
                  <Bed className="h-3 w-3" /> {(studentData.rooms?.floor || studentData.floor) ? `${studentData.rooms?.floor || studentData.floor} · ` : ''}Room {studentData.rooms?.room_number ?? studentData.room_number ?? 'N/A'} · Bed {studentData.beds?.bed_number ?? studentData.bed_number ?? 'N/A'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-400 bg-blue-900/30 border border-blue-800/40 rounded-full px-2.5 py-1">
                  <Shield className="h-3 w-3" /> {studentData.is_verified ? 'Verified Student' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={Mail} label="Email Address" value={studentData.email ?? user?.email ?? ''} />
              <InfoField icon={Phone} label="Personal Phone" value={studentData.phone} />
              <InfoField icon={Phone} label="Parent / Guardian Phone" value={studentData.parent_phone ?? ''} />
              <InfoField icon={Calendar} label="Joining Date" value={studentData.joining_date ? new Date(studentData.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} />
            </div>
          </div>

          {/* Academic */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" /> Academic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={Building} label="College / Institution" value={studentData.college_name ?? ''} />
              <InfoField icon={GraduationCap} label="Branch / Course" value={studentData.branch ?? ''} />
              <InfoField icon={Hash} label="Roll Number / Student ID" value={studentData.id_number ?? ''} />
              {maskedAadhaar && <InfoField icon={FileText} label="Aadhaar Number" value={maskedAadhaar} />}
            </div>
          </div>

          {/* Hostel Allocation */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bed className="h-3.5 w-3.5" /> Hostel Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <InfoField icon={Building} label="Hostel Name" value={studentData.hostel_name ?? 'N/A'} />
              <InfoField icon={Building} label="Room Type" value={studentData.rooms?.type ?? studentData.room_type ?? 'N/A'} />
            </div>
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row gap-6 lg:gap-10 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-6 lg:gap-10 items-center w-full">
                <div className="text-center sm:text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-center sm:justify-start gap-1">
                    Floor
                  </p>
                  <p className="text-3xl font-black">{studentData.rooms?.floor ?? studentData.floor ?? 'N/A'}</p>
                </div>
                <div className="w-px h-12 bg-slate-700 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-center sm:justify-start gap-1">
                    Room <span className="ml-1 bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-300">{studentData.rooms?.type ?? studentData.room_type ?? 'Unknown'}</span>
                  </p>
                  <p className="text-3xl font-black">{studentData.rooms?.room_number ?? studentData.room_number ?? 'N/A'}</p>
                </div>
                <div className="w-px h-12 bg-slate-700 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Bed</p>
                  <p className="text-3xl font-black text-blue-400">{studentData.beds?.bed_number ?? studentData.bed_number ?? 'N/A'}</p>
                </div>
              </div>
              <div className="sm:border-l border-slate-700 sm:pl-6 text-center sm:text-right shrink-0">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Status</p>
                <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg">
                   {studentData.is_verified ? '✅ Verified' : '⏳ Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out & Password Change */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Key className="h-5 w-5" /> Change Password
            </button>
            <button onClick={signOut} className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 font-bold py-3 px-4 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100">
              <LogOut className="h-5 w-5" /> Sign Out from Device
            </button>
          </div>

          {/* Google Account Linking */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Google Sign-In Security
            </h3>

            {fetchingGoogleStatus ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin h-5 w-5 text-slate-400" />
              </div>
            ) : googleStatus?.isLinked ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-950 font-sans">Linked to Google Account</span>
                  </div>
                  <button
                    onClick={handleUnlinkGoogle}
                    disabled={savingGoogle}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline transition"
                  >
                    Unlink Account
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Linked at: {googleStatus.googleLinkedAt ? new Date(googleStatus.googleLinkedAt).toLocaleString('en-IN') : 'N/A'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-500 leading-normal font-sans">
                    Connect your Google Account to allow logging in instantly and securely without typing your email and password.
                  </p>
                </div>
                <div className="flex justify-start">
                  <div id="google-link-button"></div>
                </div>
              </div>
            )}
          </div>

          {/* Session & Device Security Card */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Active Sessions & Device Security
            </h3>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border-b border-slate-100 pb-4">
              {googleStatus?.activities && googleStatus.activities.length > 0 ? (
                googleStatus.activities.map((act: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-50 py-2 last:border-0">
                    <div className="pr-2 min-w-0">
                      <p className="font-bold text-slate-800 font-sans">{act.event === 'LOGIN_SUCCESS' ? 'Login Success' : act.event === 'GOOGLE_LINKED' ? 'Google Account Linked' : act.event === 'GOOGLE_UNLINKED' ? 'Google Account Unlinked' : 'Login Failed'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{act.device || 'Unknown Device'} ({act.ip})</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium font-mono">{new Date(act.timestamp).toLocaleDateString('en-IN')}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No recent activity logged.</p>
              )}
            </div>

            <button
              onClick={handleLogoutAll}
              disabled={savingGoogle}
              className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              Logout from All Devices
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Change Password</h3>
                <p className="text-slate-400 text-xs mt-0.5">Set a new secure password</p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-600 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-rose-500 font-medium">Passwords do not match</p>
                )}

                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-amber-500 font-medium">Password must be at least 8 characters</p>
                )}

                <button
                  type="submit"
                  disabled={newPassword.length < 8 || newPassword !== confirmPassword || savingPassword}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Set New Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
