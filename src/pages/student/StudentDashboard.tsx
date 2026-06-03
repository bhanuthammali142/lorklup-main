// src/pages/student/StudentDashboard.tsx
/**
 * STUDENT DASHBOARD — Redesigned: dark premium theme, real complaint stats, responsive widgets, food menu SERVING NOW, notices.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Bell, Calendar, Clock, CheckCircle2,
  ArrowRight, UtensilsCrossed, MessageSquareWarning,
  Sparkles, ChevronRight, Award, ShieldAlert
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { apiFees, apiAnnouncements, apiAttendance, apiComplaints } from '../../lib/api-client'
import { PullToRefresh } from '../../components/PullToRefresh'

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export function StudentDashboard() {
  const { studentData, hostelId } = useAuth()
  const navigate = useNavigate()

  const [fees, setFees] = useState<any[]>([])
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([])
  const [attendancePct] = useState<number>(88) // High-fidelity mock stats
  const [openComplaints, setOpenComplaints] = useState<number>(0)
  const [todayAttendance, setTodayAttendance] = useState<'present' | 'absent' | 'leave' | 'unmarked'>('unmarked')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!studentData?.id || !hostelId) return
    try {
      const [feeData, annData, attData, compData] = await Promise.all([
        apiFees.getForStudent(studentData.id),
        apiAnnouncements.getAll(hostelId),
        apiAttendance.get(hostelId, new Date().toISOString().split('T')[0]),
        apiComplaints.getAll(hostelId)
      ])

      setFees(feeData || [])
      setRecentAnnouncements((annData || []).slice(0, 3))
      
      // Calculate real open complaints count
      if (Array.isArray(compData)) {
        const myComplaints = compData.filter((c: any) => c.student_id === studentData.id || c.studentId === studentData.id)
        const openCount = myComplaints.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length
        setOpenComplaints(openCount)
      }

      // Check today's attendance status
      if (Array.isArray(attData) && attData.length > 0) {
        const myRecord = attData.find((a: any) => a.student_id === studentData.id || a.id === studentData.id) as any
        if (myRecord?.attendance_status) {
          setTodayAttendance(myRecord.attendance_status)
        }
      }
    } catch (err) {
      console.error('[StudentDashboard] load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [studentData, hostelId])

  if (!studentData) return null

  const totalDue = fees.reduce((s, f) => s + Number(f.due_amount || 0), 0)
  const totalPaid = fees.reduce((s, f) => s + Number(f.paid_amount || 0), 0)
  const totalBill = fees.reduce((s, f) => s + Number(f.amount || 0), 0)
  const paidPct = totalBill > 0 ? Math.round((totalPaid / totalBill) * 100) : 100
  const nextDue = fees.find(f => f.status === 'pending' || f.status === 'overdue')
  const overdueFees = fees.filter(f => f.status === 'overdue')

  // Get current meal status based on hour
  const getServingMeal = () => {
    const hours = new Date().getHours()
    if (hours >= 7 && hours < 11) return { meal: 'Breakfast', menu: 'Idli, Dosa & Sambhar', time: '07:30 AM - 10:00 AM' }
    if (hours >= 12 && hours < 15) return { meal: 'Lunch', menu: 'Rice, Roti, Dal & Veg Curry', time: '12:30 PM - 02:30 PM' }
    if (hours >= 16 && hours < 18) return { meal: 'Snacks', menu: 'Tea, Coffee & Samosa', time: '04:30 PM - 05:30 PM' }
    if (hours >= 19 && hours < 22) return { meal: 'Dinner', menu: 'Veg Pulav, Roti & Paneer Masala', time: '07:30 PM - 09:30 PM' }
    return { meal: 'Closed', menu: 'Kitchen is currently closed', time: 'Re-opens tomorrow 7:30 AM' }
  }
  const servingMeal = getServingMeal()

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Welcome Premium Banner */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-3xl p-6 border border-slate-800/80 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shrink-0">
                {studentData.full_name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Hostel Boarder</p>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {studentData.full_name || 'Student'}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  Room <strong className="text-slate-200">{studentData.rooms?.room_number ?? 'Unassigned'}</strong> · Bed{' '}
                  <strong className="text-slate-200">{studentData.beds?.bed_number ?? '—'}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Checked In</span>
              </div>
            </div>
          </div>

          {overdueFees.length > 0 && (
            <div className="mt-5 flex items-center gap-3 bg-rose-500/15 border border-rose-500/25 rounded-2xl px-4 py-3 animate-pulse">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <span className="text-xs text-rose-300 font-bold block">Action Required: Overdue Fees</span>
                <span className="text-[11px] text-rose-400 font-medium">Please clear {overdueFees.length} overdue invoices to avoid academic holds.</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Attendance Rate',
              value: loading ? '...' : `${attendancePct}%`,
              sub: todayAttendance === 'present' ? 'Today: Present ✅' : todayAttendance === 'absent' ? 'Today: Absent ❌' : 'Unmarked today',
              icon: Calendar,
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Outstanding Dues',
              value: loading ? '...' : fmt(totalDue),
              sub: totalDue === 0 ? 'All Clear 🎉' : 'Immediate action',
              icon: Wallet,
              color: totalDue > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Open Complaints',
              value: loading ? '...' : String(openComplaints),
              sub: openComplaints === 0 ? 'All Resolved' : 'Under Investigation',
              icon: MessageSquareWarning,
              color: openComplaints > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-slate-400 bg-slate-900 border-slate-800',
            },
            {
              label: 'Reward Points',
              value: '450',
              sub: 'Gold Tier Boarder',
              icon: Award,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
            },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${card.color.split(' ')[1]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-black text-white">{card.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{card.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fee outstanding card - left column */}
          <div 
            className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-all duration-300"
            onClick={() => navigate('/student/fees')}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Current Account Dues</p>
                  <p className="text-3xl font-black text-white mt-1">{loading ? '...' : fmt(totalDue)}</p>
                </div>
                <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 tracking-wider mb-2">
                  <span>BILL STATUS: {paidPct}% PAID</span>
                  <span>TOTAL SEMESTER FEES: {fmt(totalBill)}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {nextDue && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 flex-1">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300 font-bold">
                    Due {new Date(nextDue.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {fmt(Number(nextDue.due_amount))}
                  </span>
                </div>
              )}
              <button className="bg-white text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition active:scale-[0.98] shrink-0">
                Pay Bill Now <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Serving Now - Mess Menu */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-blue-400" />
                  <h3 className="font-black text-white text-sm">Mess Menu</h3>
                </div>
                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">Serving Now</span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold text-slate-400">{servingMeal.meal}</p>
                <p className="text-base font-black text-white mt-1 leading-snug">{servingMeal.menu}</p>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {servingMeal.time}
                </p>
              </div>
            </div>

            <button 
              onClick={() => navigate('/student/food')}
              className="w-full mt-5 bg-slate-800 border border-slate-700/60 hover:bg-slate-700/60 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
            >
              Weekly Schedule <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Notices & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pinned Announcements */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-400" />
                <h3 className="font-black text-white text-sm">Announcements & Notices</h3>
              </div>
              <button onClick={() => navigate('/student/announcements')} className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center">
                All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />)}
              </div>
            ) : recentAnnouncements.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Bell className="h-7 w-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No notifications from administrators</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((ann: any) => (
                  <div key={ann.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60 flex gap-3.5 hover:border-slate-700 transition">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-slate-200">{ann.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{ann.message}</p>
                      <p className="text-[9px] text-slate-500 mt-1.5 font-bold">
                        {new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Column */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
            <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" /> Quick Tasks
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: 'View Fee History', path: '/student/fees', icon: Wallet, color: 'text-blue-400 bg-blue-500/10' },
                { label: "Check-in & Attendance", path: '/student/attendance', icon: Calendar, color: 'text-emerald-400 bg-emerald-500/10' },
                { label: 'File Complaint Ticket', path: '/student/complaints', icon: MessageSquareWarning, color: 'text-rose-400 bg-rose-500/10' },
                { label: 'Redeem Boarder Rewards', path: '/student/rewards', icon: Award, color: 'text-indigo-400 bg-indigo-500/10' },
              ].map((action, i) => {
                const Icon = action.icon
                return (
                  <button
                    key={i}
                    onClick={() => navigate(action.path)}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition active:scale-[0.98] text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 leading-tight">{action.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </PullToRefresh>
  )
}
export default StudentDashboard
