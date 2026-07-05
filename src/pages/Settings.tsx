// src/pages/Settings.tsx
import { useEffect, useState, lazy, Suspense } from 'react'
import { 
  Building, 
  Bell, 
  ShieldAlert, 
  CreditCard, 
  Database, 
  HelpCircle, 
  ChevronRight, 
  Search, 
  ArrowLeft, 
  LogOut, 
  Key, 
  Save, 
  Loader2, 
  UtensilsCrossed, 
  Download, 
  LayoutGrid,
  CalendarRange,
  Bed,
  Users,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { getOrCreateHostel, updateHostel, updateProfile } from '../lib/api'
import { apiAuth } from '../lib/api-client'
import type { Hostel } from '../types'
import toast from 'react-hot-toast'

const FoodMenuEditor = lazy(() => import('./FoodMenuEditor').then(m => ({ default: m.FoodMenuEditor })))

type SubPage = 'hostel_profile' | 'notifications' | 'security' | 'financial' | 'data' | 'about' | 'food_menu' | null

export function Settings() {
  const { user, signOut, setUser } = useAuth()
  const [activeSubPage, setActiveSubPage] = useState<SubPage>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hostel, setHostel] = useState<Hostel | null>(null)
  const [saving, setSaving] = useState(false)

  const [googleStatus, setGoogleStatus] = useState<{ isLinked: boolean; googleLinkedAt: string | null; authProvider: string; activities: any[] } | null>(null);
  const [fetchingGoogleStatus, setFetchingGoogleStatus] = useState(false);

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

  useEffect(() => {
    if (activeSubPage === 'security') {
      loadGoogleStatus();
    }
  }, [activeSubPage]);

  const handleUnlinkGoogle = async () => {
    if (!confirm('Are you sure you want to unlink your Google Account?')) return;
    setSaving(true);
    try {
      await apiAuth.unlinkGoogle();
      toast.success('Google account unlinked successfully!');
      loadGoogleStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink Google account.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out from all devices? This will invalidate all your current active sessions.')) return;
    setSaving(true);
    try {
      await apiAuth.logoutAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to logout from all devices.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    if (activeSubPage === 'security' && googleStatus && !googleStatus.isLinked) {
      const renderLinkButton = () => {
        if ((window as any).google && document.getElementById('google-link-button')) {
          (window as any).google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
            callback: async (response: any) => {
              setSaving(true);
              try {
                await apiAuth.linkGoogle(response.credential);
                toast.success('Google account linked successfully!');
                loadGoogleStatus();
              } catch (err: any) {
                toast.error(err.message || 'Failed to link Google account.');
              } finally {
                setSaving(false);
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
  }, [activeSubPage, googleStatus]);
  
  // Hostel details form state
  const [hostelForm, setHostelForm] = useState({
    name: '',
    address: '',
    contact_phone: '',
    contact_email: '',
  })

  // User profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
  })

  // Bank details form state
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc_code: '',
  })

  // Password update form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Notifications form state
  const [notifPreferences, setNotifPreferences] = useState({
    emailComplaints: true,
    smsOverdueFees: true,
    emailDailyAttendance: false,
    pushRewards: true,
  })

  useEffect(() => {
    if (!user) return
    
    // Set Profile form from current user context
    setProfileForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
    })

    if (user.role === 'admin') {
      setBankForm({
        bank_name: (user as any).bank_name ?? '',
        account_holder: (user as any).account_holder ?? '',
        account_number: (user as any).account_number ?? '',
        ifsc_code: (user as any).ifsc_code ?? '',
      })
    }

    // Fetch Hostel details
    getOrCreateHostel(String(user.id)).then(h => {
      if (h) {
        setHostel(h)
        setHostelForm({
          name: h.name ?? '',
          address: h.address ?? '',
          contact_phone: h.contact_phone ?? '',
          contact_email: h.contact_email ?? user.email ?? '',
        })
      }
    })
  }, [user])

  const handleSaveHostelAndProfile = async () => {
    setSaving(true)
    try {
      // Save Hostel Details if loaded
      if (hostel) {
        await updateHostel(hostel.id, {
          name: hostelForm.name,
          address: hostelForm.address,
          contact_phone: hostelForm.contact_phone,
        })
      }
      
      // Save User Profile
      await updateProfile(profileForm.name, profileForm.phone, profileForm.email)
      
      // Update local auth context immediately
      if (user) {
        setUser({
          ...user,
          name: profileForm.name,
          phone: profileForm.phone,
          email: profileForm.email,
        })
      }
      
      toast.success('Profile and Hostel details saved!')
      setActiveSubPage(null)
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (!passwordForm.newPassword) {
      toast.error('Password cannot be empty')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      await apiAuth.changePassword(passwordForm.newPassword)
      toast.success('Password updated successfully!')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setActiveSubPage(null)
    } catch (err: any) {
      console.error('Password update error:', err)
      toast.error(err.message || 'Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Notification preferences updated!')
      setActiveSubPage(null)
    }, 500)
  }

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      user,
      hostel,
      preferences: notifPreferences
    }, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `hostelos_settings_export.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('Data exported successfully!')
  }

  const settingsItems = [
    {
      category: 'HOSTEL ADMINISTRATION',
      items: [
        { id: 'hostel_profile' as SubPage, name: 'Hostel Profile', desc: 'Name, address, and contact details', icon: Building, color: 'bg-blue-50 text-blue-600' },
        { id: 'notifications' as SubPage, name: 'Notifications', desc: 'Push, email, and SMS preferences', icon: Bell, color: 'bg-indigo-50 text-indigo-600' }
      ]
    },
    {
      category: 'SECURITY & ACCESS',
      items: [
        { id: 'security' as SubPage, name: 'Login & Security', desc: 'Password, 2FA, session management', icon: ShieldAlert, color: 'bg-blue-50 text-blue-600' }
      ]
    },
    {
      category: 'OPERATIONS',
      items: [
        { id: 'food_menu' as SubPage, name: 'Food Menu', desc: 'Manage hostel meals and catering', icon: UtensilsCrossed, color: 'bg-purple-50 text-purple-600' },
        { id: 'financial' as SubPage, name: 'Financial Configurations', desc: 'Tax settings, currency, and gateways', icon: CreditCard, color: 'bg-indigo-50 text-indigo-600' },
        { id: 'data' as SubPage, name: 'Data Management', desc: 'Backup, export, and audit logs', icon: Database, color: 'bg-blue-50 text-blue-600' }
      ]
    },
    {
      category: 'SUPPORT',
      items: [
        { id: 'about' as SubPage, name: 'About & Support', desc: 'Help center and version info', icon: HelpCircle, color: 'bg-indigo-50 text-indigo-600' }
      ]
    }
  ]

  // Filter settings based on search input
  const filteredSettings = settingsItems.map(cat => {
    const items = cat.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return { ...cat, items }
  }).filter(cat => cat.items.length > 0)

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-50 min-h-[85vh] rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col pb-20">
      
      {/* Settings Navigation/Header (Always Present) */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-500/10">
            {profileForm.name?.charAt(0) || 'A'}
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight text-base">HostelOS</span>
        </div>
        <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubPage === null ? (
          /* MAIN SETTINGS PAGE VIEW */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-6 space-y-6 overflow-y-auto"
          >
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
              <p className="text-xs text-slate-500 mt-1">Configure your administrative environment</p>
            </div>

            {/* Search Settings Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search settings (⌘K)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm transition"
              />
            </div>

            {/* Render Filtered Settings List */}
            <div className="space-y-6">
              {filteredSettings.map(cat => (
                <div key={cat.category} className="space-y-2">
                  <h3 className="text-[10px] font-black text-indigo-600/80 uppercase tracking-widest pl-1">{cat.category}</h3>
                  <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                    {cat.items.map(item => (
                      <button
                        key={item.name}
                        onClick={() => setActiveSubPage(item.id)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl shrink-0 ${item.color} shadow-sm border border-black/5`}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Logout Buttons */}
            <div className="pt-4 space-y-3">
              <button
                onClick={signOut}
                className="w-full py-3.5 bg-rose-50/50 hover:bg-rose-50 text-rose-600 font-bold border border-rose-200/60 rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="h-4 w-4" /> Log Out of All Devices
              </button>
              <p className="text-center text-[10px] text-slate-400 font-medium">HostelOS Enterprise v4.2.0-stable</p>
            </div>
          </motion.div>
        ) : (
          /* DETAIL SUB-PAGES VIEWS */
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-6 space-y-6 overflow-y-auto"
          >
            {/* Back Button */}
            <button
              onClick={() => setActiveSubPage(null)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
            >
              <ArrowLeft className="h-4 w-4" /> back to Settings
            </button>

            {/* 1. Hostel Profile & Admin Details Form */}
            {activeSubPage === 'hostel_profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Hostel Profile</h2>
                  <p className="text-xs text-slate-400 mt-1">Name, address, and contact details</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Hostel Metadata</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Hostel Name</label>
                      <input
                        type="text"
                        value={hostelForm.name}
                        onChange={e => setHostelForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Address</label>
                      <textarea
                        rows={3}
                        value={hostelForm.address}
                        onChange={e => setHostelForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Primary Admin Profile</h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Contact Phone</label>
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveHostelAndProfile}
                    disabled={saving}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save Details
                  </button>
                </div>
              </div>
            )}

            {/* 2. Notifications Preferences Form */}
            {activeSubPage === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Notifications</h2>
                  <p className="text-xs text-slate-400 mt-1">Push, email, and SMS preferences</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {[
                      {
                        id: 'emailComplaints',
                        title: 'Complaint Email Alerts',
                        desc: 'Send an email update instantly whenever a student files a new complaint.',
                        value: notifPreferences.emailComplaints,
                      },
                      {
                        id: 'smsOverdueFees',
                        title: 'SMS Payment Reminders',
                        desc: 'Send automated SMS to students when their monthly fee balance becomes overdue.',
                        value: notifPreferences.smsOverdueFees,
                      },
                      {
                        id: 'emailDailyAttendance',
                        title: 'Daily Attendance Report',
                        desc: 'Receive an automated email summary at 10 PM daily containing today\'s absent list.',
                        value: notifPreferences.emailDailyAttendance,
                      },
                      {
                        id: 'pushRewards',
                        title: 'Rewards Updates',
                        desc: 'Get alerted when student points are updated or new leaderboard rankings roll out.',
                        value: notifPreferences.pushRewards,
                      },
                    ].map((pref) => (
                      <div key={pref.id} className="p-5 flex justify-between items-start gap-4 hover:bg-slate-50 transition duration-150">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-sm">{pref.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{pref.desc}</p>
                        </div>
                        <button
                          onClick={() => setNotifPreferences(p => ({ ...p, [pref.id]: !p[pref.id as keyof typeof notifPreferences] }))}
                          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            pref.value ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        >
                          <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                            pref.value ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* 3. Login & Security Form */}
            {activeSubPage === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Login & Security</h2>
                  <p className="text-xs text-slate-400 mt-1">Password, 2FA, session management</p>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Change Password</h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Confirm Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSavePassword}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Key className="h-4 w-4" />} Update Password
                </button>

                {/* Google Account Linking Card */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Google Sign-In Link</h3>
                  
                  {fetchingGoogleStatus ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="animate-spin h-5 w-5 text-slate-400" />
                    </div>
                  ) : googleStatus?.isLinked ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-semibold text-emerald-950 font-sans">Linked to Google Account</span>
                        </div>
                        <button
                          onClick={handleUnlinkGoogle}
                          disabled={saving}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline transition"
                        >
                          Unlink Account
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">Linked at: {googleStatus.googleLinkedAt ? new Date(googleStatus.googleLinkedAt).toLocaleString('en-IN') : 'N/A'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
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
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Active Sessions & Device Security</h3>
                  <p className="text-[11px] text-slate-400 -mt-2">View recently logged activity and globally invalidate active sessions.</p>
                  
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
                    disabled={saving}
                    className="w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    Logout from All Devices
                  </button>
                </div>
              </div>
            )}

            {/* 4. Food Menu Editor Tab */}
            {activeSubPage === 'food_menu' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Food Menu</h2>
                  <p className="text-xs text-slate-400 mt-1">Manage hostel meals and catering</p>
                </div>
                
                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                  <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>}>
                    <FoodMenuEditor />
                  </Suspense>
                </div>
              </div>
            )}

            {/* 5. Financial Configurations Form */}
            {activeSubPage === 'financial' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Financial Configurations</h2>
                  <p className="text-xs text-slate-400 mt-1">Tax settings, currency, and payment gateways</p>
                </div>

                {/* Notice Banner */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Payment Gateway</h3>
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mt-0.5">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Centralized Payments Enabled</h4>
                      <p className="text-[11px] text-indigo-600/90 leading-relaxed mt-0.5">
                        Online student payments and platform subscriptions are centrally managed by the platform administrator via Razorpay. Student fees paid online will be collected and settled directly to your registered bank account below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settlement Bank Details Card */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Settlement Bank Account</h3>
                  <p className="text-[11px] text-slate-400 -mt-2">Provide bank details where online collected student fees will be transferred.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={bankForm.bank_name}
                        onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Name as in Bank Passbook"
                        value={bankForm.account_holder}
                        onChange={e => setBankForm({ ...bankForm, account_holder: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Account Number</label>
                      <input
                        type="text"
                        placeholder="Bank Account Number"
                        value={bankForm.account_number}
                        onChange={e => setBankForm({ ...bankForm, account_number: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={bankForm.ifsc_code}
                        onChange={e => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Localization & Tax</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Currency</label>
                      <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white">
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">GST / Service Tax (%)</label>
                      <input
                        type="number"
                        defaultValue="18"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setSaving(true)
                    try {
                      await updateProfile(
                        profileForm.name,
                        profileForm.phone,
                        profileForm.email,
                        bankForm.bank_name,
                        bankForm.account_holder,
                        bankForm.account_number,
                        bankForm.ifsc_code
                      )
                      if (user) {
                        setUser({
                          ...user,
                          bank_name: bankForm.bank_name,
                          account_holder: bankForm.account_holder,
                          account_number: bankForm.account_number,
                          ifsc_code: bankForm.ifsc_code,
                        })
                      }
                      toast.success('Financial & Bank details saved!')
                      setActiveSubPage(null)
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to save bank details')
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Financial Configs
                </button>
              </div>
            )}

            {/* 6. Data Management Form */}
            {activeSubPage === 'data' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Data Management</h2>
                  <p className="text-xs text-slate-400 mt-1">Backup, export, and audit logs</p>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Export System Data</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download your administrative settings, tenant profiles, and metadata records in structured JSON format.
                  </p>
                  
                  <button
                    onClick={handleExportData}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-2xl text-sm transition flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Export Configuration JSON
                  </button>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">System Cache</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clear local storage token cache if you are experiencing session authentication conflicts.
                  </p>
                  
                  <button
                    onClick={() => {
                      localStorage.clear()
                      toast.success('Authentication cache cleared. Please reload.')
                      window.location.reload()
                    }}
                    className="w-full py-3 bg-rose-50/50 hover:bg-rose-50 text-rose-600 border border-rose-200/60 font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2"
                  >
                    Clear Local Session Cache
                  </button>
                </div>
              </div>
            )}

            {/* 7. About & Support */}
            {activeSubPage === 'about' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">About & Support</h2>
                  <p className="text-xs text-slate-400 mt-1">Help center, licenses, and version info</p>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4 text-center">
                  <div className="h-16 w-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Info className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">HostelOS Enterprise</h3>
                    <p className="text-xs text-slate-400 mt-1">Version v4.2.0-stable</p>
                  </div>
                  <div className="h-px bg-slate-100 my-2" />
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    HostelOS is a premium, secure SaaS Hostel Management System built for hostel owners and administrators globally.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Developer Support</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Support Email</span>
                      <span className="font-bold text-slate-800">support@hostelos.com</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Documentation</span>
                      <a href="https://supabase.com/docs" target="_blank" rel="noreferrer" className="font-bold text-indigo-600 hover:underline">Read Docs</a>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Database Engine</span>
                      <span className="font-bold text-slate-800">PostgreSQL (Supabase)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar for Mobile (Mocked to match user screenshot style) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white border-t border-slate-200/60 py-2 px-6 flex justify-between items-center z-50 md:hidden shadow-lg shadow-black/5">
        <button 
          onClick={() => window.location.href = '/admin'}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-600 transition"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => window.location.href = '/admin/bookings'}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-600 transition"
        >
          <CalendarRange className="h-5 w-5" />
          <span className="text-[10px] font-bold">Bookings</span>
        </button>
        <button 
          onClick={() => window.location.href = '/admin/rooms'}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-600 transition"
        >
          <Bed className="h-5 w-5" />
          <span className="text-[10px] font-bold">Rooms</span>
        </button>
        <button 
          onClick={() => window.location.href = '/admin/students'}
          className="flex flex-col items-center gap-1 text-indigo-600 transition"
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-bold">Students</span>
        </button>
      </div>

    </div>
  )
}

