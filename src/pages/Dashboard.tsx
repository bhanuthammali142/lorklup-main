// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { Users, Bed, CreditCard, TrendingUp, Sparkles, AlertCircle, RefreshCw, MessageSquareWarning } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/AuthContext'
import { getOrCreateHostel, getDashboardStats, getRevenueByMonth, getRoomsWithBeds, getComplaints } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Skeleton } from '../components/Skeleton'
import { AnimateView } from '../components/AnimateView'

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export function Dashboard() {
  useDocumentTitle('Dashboard')
  
  const { user } = useAuth()
  const [hostelId, setHostelId] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalStudents: 0, totalBeds: 0, occupiedBeds: 0, monthlyRevenue: 0, pendingFees: 0, overdueFees: 0, pendingComplaints: 0 })
  const [revenueData, setRevenueData] = useState<{ name: string; amount: number }[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getOrCreateHostel(user.id).then(h => {
      if (h) setHostelId(h.id)
    })
  }, [user])

  useEffect(() => {
    if (!hostelId) return
    setLoading(true)
    Promise.all([
      getDashboardStats(hostelId),
      getRevenueByMonth(hostelId),
      getRoomsWithBeds(hostelId),
      getComplaints(hostelId)
    ])
      .then(([s, rev, rData, complaints]) => {
        const pendingComp = Array.isArray(complaints) ? complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length : 0
        setStats({
          totalStudents: s.totalStudents || 0,
          totalBeds: s.totalBeds || 0,
          occupiedBeds: s.occupiedBeds || 0,
          monthlyRevenue: s.monthlyRevenue || 0,
          pendingFees: s.pendingFees || 0,
          overdueFees: s.overdueFees || 0,
          pendingComplaints: pendingComp
        })
        setRevenueData(rev || [])
        setRooms(rData || [])
      })
      .finally(() => setLoading(false))
  }, [hostelId])

  const occupancyRate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0

  const cards = [
    { name: 'Total Students', value: String(stats.totalStudents), icon: Users, change: 'Registered residents', positive: true, color: 'bg-blue-50 text-blue-600' },
    { name: 'Occupancy Rate', value: `${occupancyRate}%`, icon: Bed, change: `${stats.occupiedBeds} / ${stats.totalBeds} beds`, positive: true, color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Monthly Revenue', value: fmt(stats.monthlyRevenue), icon: TrendingUp, change: 'Collected this month', positive: true, color: 'bg-indigo-50 text-indigo-600' },
    { name: 'Pending Fees', value: fmt(stats.pendingFees + stats.overdueFees), icon: CreditCard, change: `${fmt(stats.overdueFees)} overdue`, positive: false, color: 'bg-rose-50 text-rose-600' },
    { name: 'Pending Complaints', value: String(stats.pendingComplaints), icon: MessageSquareWarning, change: 'Requires resolution', positive: false, color: 'bg-amber-50 text-amber-600' }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => hostelId && Promise.all([getDashboardStats(hostelId), getRevenueByMonth(hostelId), getRoomsWithBeds(hostelId)]).then(([s, rev, rData]) => { setStats(s); setRevenueData(rev); setRooms(rData) })}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => toast('No new alerts.', { icon: '🔔' })} className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
            {stats.overdueFees > 0 ? 'Overdue Fees!' : <span className="hidden sm:inline">No Alerts</span>}
          </button>
          <button
            onClick={() => toast('AI insights require a Gemini API key. Add VITE_GEMINI_KEY to .env.local to enable.', { icon: '🤖', duration: 5000 })}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:shadow hover:bg-blue-700 transition-all opacity-70 cursor-not-allowed"
            title="Configure Gemini API key to enable"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">AI Insights (Configure)</span>
            <span className="sm:hidden">AI</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card-premium p-4 sm:p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <Icon className="w-16 h-16 sm:w-24 sm:h-24" />
              </div>
              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-500">{stat.name}</p>
                  <AnimateView isLoading={loading} fallback={<Skeleton className="h-7 sm:h-8 w-24 mt-1 rounded" />}>
                    <h3 className="text-lg sm:text-2xl font-bold tracking-tight mt-0.5 sm:mt-1 text-slate-900">{stat.value}</h3>
                  </AnimateView>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm relative z-10">
                <span className={stat.positive ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                  {stat.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Sparkline Chart */}
        <div className="card-premium flex flex-col col-span-2 min-h-[350px]">
          <div className="border-b border-slate-100 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue Overview</h2>
              <p className="text-sm text-slate-400 mt-0.5">Monthly collected fees</p>
            </div>
            {!loading && revenueData.length > 0 && (
              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Total: {fmt(revenueData.reduce((s, r) => s + r.amount, 0))}
              </span>
            )}
          </div>
          <div className="flex-1 p-4">
            <AnimateView 
              isLoading={loading}
              fallback={
                <div className="h-[260px] w-full flex items-end gap-2 px-4 pb-6 pt-10">
                  <Skeleton className="w-1/6 h-[30%] rounded-t-sm" />
                  <Skeleton className="w-1/6 h-[50%] rounded-t-sm" />
                  <Skeleton className="w-1/6 h-[80%] rounded-t-sm" />
                  <Skeleton className="w-1/6 h-[60%] rounded-t-sm" />
                  <Skeleton className="w-1/6 h-[90%] rounded-t-sm" />
                  <Skeleton className="w-1/6 h-[100%] rounded-t-sm" />
                </div>
              }
            >
              {revenueData.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <TrendingUp className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No revenue recorded yet. Mark fees as paid to see data.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={8} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </AnimateView>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="card-premium flex flex-col bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <div className="border-b border-purple-100 p-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI Suggestions</h2>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {stats.overdueFees > 0 && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-4">
                <h4 className="font-semibold text-rose-900 text-sm">⚠️ Overdue Fees</h4>
                <p className="text-sm text-rose-700 mt-1">{fmt(stats.overdueFees)} in overdue payments. Send WhatsApp reminders now.</p>
                <button disabled className="mt-3 text-xs font-semibold bg-rose-300 text-white px-3 py-1.5 rounded opacity-60 cursor-not-allowed" title="Integrate WhatsApp API to enable">Send Reminders (API Required)</button>
              </div>
            )}
            {stats.pendingFees > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                <h4 className="font-semibold text-blue-900 text-sm">📋 Pending Collection</h4>
                <p className="text-sm text-blue-700 mt-1">{fmt(stats.pendingFees)} pending this month. Follow up with students.</p>
                <button disabled className="mt-3 text-xs font-semibold bg-blue-300 text-white px-3 py-1.5 rounded opacity-60 cursor-not-allowed" title="Integrate WhatsApp API to enable">Execute Now (API Required)</button>
              </div>
            )}
            {stats.pendingFees === 0 && stats.overdueFees === 0 && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                <h4 className="font-semibold text-emerald-900 text-sm">✅ All Clear!</h4>
                <p className="text-sm text-emerald-700 mt-1">No pending or overdue fees this month. Great collection rate!</p>
              </div>
            )}
            <div className="rounded-lg bg-purple-50 border border-purple-100 p-4">
              <h4 className="font-semibold text-purple-900 text-sm">🏠 Occupancy</h4>
              <p className="text-sm text-purple-700 mt-1">Current occupancy is {occupancyRate}%. {occupancyRate < 80 ? 'Consider marketing to fill vacant beds.' : 'Excellent utilization!'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Room Status Matrix */}
      <div className="card-premium flex flex-col mt-6">
        <div className="border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Live Room Status</h2>
            <p className="text-sm text-slate-400 mt-0.5">Floor-wise room and bed availability</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Available</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Maintenance</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>Occupied</span>
          </div>
        </div>
        <div className="p-6">
          <AnimateView
            isLoading={loading}
            fallback={
              <div className="space-y-8">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
                      <Skeleton className="h-8 w-32 rounded-lg" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <div key={j} className="border border-slate-200 rounded-xl p-3 shadow-sm bg-slate-50">
                          <div className="flex justify-between items-center mb-3">
                            <Skeleton className="h-4 w-16 rounded" />
                            <Skeleton className="h-3 w-10 rounded" />
                          </div>
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((b) => <Skeleton key={b} className="h-8 w-8 rounded-lg" />)}
                          </div>
                          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            {rooms.length === 0 ? (
              <div className="h-32 flex items-center justify-center flex-col text-slate-400 gap-2">
                 <Bed className="w-8 h-8 opacity-30" />
                 <p className="text-sm">No rooms configured. Add rooms to see the live status here.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  rooms.reduce((acc, room) => {
                    const floorName = room.floor ? room.floor.trim() : 'Unspecified Floor';
                    if (!acc[floorName]) acc[floorName] = [];
                    acc[floorName].push(room);
                    return acc;
                  }, {} as Record<string, typeof rooms>)
                ).map(([floor, floorRooms]) => (
                  <div key={floor} className="bg-white rounded-xl">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2">
                      <div className="h-8 px-3 bg-blue-50 text-blue-700 rounded-lg flex items-center font-bold text-sm tracking-wide uppercase border border-blue-100">
                        {floor}
                      </div>
                      <span className="text-sm font-medium text-slate-400">{floorRooms.length} Rooms</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {floorRooms.map((room: any) => (
                        <div key={room.id} className="border border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-colors bg-slate-50 shadow-sm relative group">
                          <div className="flex justify-between items-center mb-3">
                             <span className="font-bold text-slate-800 text-sm">Room {room.room_number}</span>
                             <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-slate-100">{room.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(room.beds || [])
                              .filter((b: any) => b && b.bed_number)
                              .sort((a: any, b: any) => (a.bed_number || '').localeCompare(b.bed_number || ''))
                              .map((bed: any) => (
                                <div 
                                  key={bed.id || Math.random()} 
                                  title={`Bed ${bed.bed_number || 'Unknown'} - ${bed.status || 'Unknown'}`}
                                  className={`flex items-center justify-center h-7 w-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                    bed.status === 'available' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-500 group-hover:text-white cursor-help' : 
                                    bed.status === 'maintenance' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                    'bg-slate-200 text-slate-400 border border-slate-300'
                                  }`}
                                >
                                  {(bed.bed_number || '').replace(/[^0-9]/g, '') || (bed.bed_number || '').charAt(0) || '?'}
                                </div>
                              ))}
                          </div>
                          {/* Occupancy Progress bar underneath */}
                          <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                            {(room.beds || [])
                              .filter((b: any) => b && b.id)
                              .map((bed: any, i: number) => (
                                 <div 
                                   key={bed.id || i} 
                                   className={`h-full flex-1 ${bed.status === 'available' ? 'bg-transparent' : bed.status === 'maintenance' ? 'bg-amber-400' : 'bg-slate-400'}`} 
                                   style={{ marginLeft: i > 0 ? '1px' : '0' }}
                                 />
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimateView>
        </div>
      </div>
    </div>
  )
}
