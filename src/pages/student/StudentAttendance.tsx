import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Calendar, ChevronLeft, ChevronRight, QrCode } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { apiAttendance } from '../../lib/api-client'
import toast from 'react-hot-toast'

export function StudentAttendance() {
  const { studentData, hostelId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todayStatus, setTodayStatus] = useState<'present' | 'absent' | 'leave' | 'unmarked'>('unmarked')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [history, setHistory] = useState<{ date: string; status: 'present' | 'absent' | 'leave' }[]>([])

  useEffect(() => {
    if (!studentData?.id || !hostelId) return

    const fetchAttendanceData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const [todayData, historyData] = await Promise.all([
          apiAttendance.get(hostelId, todayStr),
          apiAttendance.getHistory(studentData.id)
        ])

        if (Array.isArray(todayData)) {
          const myRecord = todayData.find((a: any) => a.student_id === studentData.id || a.id === studentData.id) as any
          if (myRecord?.attendance_status) {
            setTodayStatus(myRecord.attendance_status)
          }
        }

        if (Array.isArray(historyData)) {
          setHistory(historyData)
        }
      } catch (err) {
        console.error('Failed to load attendance data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [studentData, hostelId])

  const handleSelfCheckin = () => {
    toast.success('Self check-in QR scanner coming soon! Standardized for native deployment.')
  }

  // Generate calendar days for selected month using real database history logs
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const startDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    // Add empty slots for offset
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Add actual days
    for (let d = 1; d <= totalDays; d++) {
      const formattedDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const match = history.find(h => h.date.split('T')[0] === formattedDayString)
      const status: 'present' | 'absent' | 'leave' | 'none' = match ? match.status : 'none'
      days.push({ dayNum: d, status })
    }
    return days
  }

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
  }

  const calendarDays = getDaysInMonth(selectedDate)
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Calculate real student attendance stats
  const totalLogs = history.length
  const presentCount = history.filter(h => h.status === 'present').length
  const absentCount = history.filter(h => h.status === 'absent').length
  const leaveCount = history.filter(h => h.status === 'leave').length
  const percentage = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 100

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-6 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Status Overview</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">My Attendance</h1>
            <p className="text-slate-400 text-sm mt-1">
              Keep check-in record verified every day
            </p>
          </div>
          <button 
            onClick={handleSelfCheckin}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-sm"
          >
            <QrCode className="h-4 w-4" /> Self Check-In
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Rate', value: `${percentage}%`, sub: 'Target: 85%', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
          { label: 'Present Days', value: String(presentCount), sub: 'This semester', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
          { label: 'Absent Days', value: String(absentCount), sub: 'Excuses required', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
          { label: 'On Leave', value: String(leaveCount), sub: 'Approved permits', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
        ].map((card, idx) => (
          <div key={idx} className={`rounded-2xl border p-4 backdrop-blur-md ${card.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">{card.label}</p>
            <p className="text-2xl font-black mt-1">{card.value}</p>
            <p className="text-xs mt-0.5 opacity-70">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's Status Banner */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Check-in Record</p>
            <p className="text-sm font-bold text-white mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div>
          {loading ? (
            <span className="text-xs text-slate-500">Checking...</span>
          ) : todayStatus === 'present' ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/35 rounded-full px-3.5 py-1 text-emerald-400 text-xs font-black uppercase">
              <CheckCircle2 className="h-4 w-4" /> Present
            </div>
          ) : todayStatus === 'absent' ? (
            <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/35 rounded-full px-3.5 py-1 text-rose-400 text-xs font-black uppercase">
              <XCircle className="h-4 w-4" /> Absent
            </div>
          ) : todayStatus === 'leave' ? (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/35 rounded-full px-3.5 py-1 text-amber-400 text-xs font-black uppercase">
              <Calendar className="h-4 w-4" /> Leave
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3.5 py-1 text-slate-400 text-xs font-black uppercase">
              Unmarked
            </div>
          )}
        </div>
      </div>

      {/* Calendar and Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-white">Monthly Tracker</h3>
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-200 px-2">{monthName}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const isToday = day.dayNum === new Date().getDate() && selectedDate.getMonth() === new Date().getMonth();
              
              let statusClass = 'bg-slate-800/40 text-slate-500';
              if (day.status === 'present') statusClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
              else if (day.status === 'absent') statusClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
              else if (day.status === 'leave') statusClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

              return (
                <div
                  key={`day-${day.dayNum}`}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative ${statusClass} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''}`}
                >
                  <span>{day.dayNum}</span>
                  {day.status !== 'none' && (
                    <span className={`h-1 w-1 rounded-full absolute bottom-1.5 ${day.status === 'present' ? 'bg-emerald-400' : day.status === 'absent' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Attendance Logs list */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
          <h3 className="font-black text-white mb-4">Recent Records</h3>
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-center py-12 text-xs font-semibold text-slate-500">
                No check-in records found.
              </div>
            ) : (
              history.map((log, idx) => {
                const dateStr = new Date(log.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/50">
                    <div>
                      <p className="text-xs font-black text-slate-200">{dateStr}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Status: Verified</p>
                    </div>
                    <div>
                      {log.status === 'present' ? (
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Present</span>
                      ) : log.status === 'absent' ? (
                        <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Absent</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Leave</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
