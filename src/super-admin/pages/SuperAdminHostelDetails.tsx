// src/super-admin/pages/SuperAdminHostelDetails.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, Users, Bed, IndianRupee,
  Mail, Phone, MapPin, Calendar, Search, ShieldCheck,
  TrendingUp, CreditCard, AlertCircle, Loader2, Award
} from 'lucide-react'
import { apiHostels, apiSuperAdmin, apiRooms } from '../../lib/api-client'

function safeExtractArray(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    if (res.data && Array.isArray(res.data)) return res.data
    // If it has success: false or an error message, fallback to empty array
    if (res.success === false || res.error) return []
  }
  return []
}

export function SuperAdminHostelDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'students' | 'finances'>('overview')
  const [studentSearch, setStudentSearch] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')

  // 1. Fetch all hostels to find our selected one
  const { data: hostelsRaw = [], isLoading: loadingHostel } = useQuery<any[]>({
    queryKey: ['sa-hostels'],
    queryFn: async () => {
      const res = await apiHostels.getAll()
      return safeExtractArray(res)
    },
  })
  const hostels = safeExtractArray(hostelsRaw)
  const hostel = hostels.find((h: any) => String(h.id) === String(id)) as any

  // 2. Fetch students for this hostel
  const { data: studentsRaw = [], isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['sa-hostel-students', id],
    queryFn: async () => {
      const res = await apiSuperAdmin.getStudents({ hostel_id: id || '' })
      return safeExtractArray(res)
    },
    enabled: !!id,
  })
  const students = safeExtractArray(studentsRaw)

  // 3. Fetch fees for this hostel
  const { data: feesRaw = [], isLoading: loadingFees } = useQuery<any[]>({
    queryKey: ['sa-hostel-fees', id],
    queryFn: async () => {
      const res = await apiSuperAdmin.getFees({ hostel_id: id || '' })
      return safeExtractArray(res)
    },
    enabled: !!id,
  })
  const fees = safeExtractArray(feesRaw)

  // 4. Fetch payments for this hostel
  const { data: paymentsRaw = [], isLoading: loadingPayments } = useQuery<any[]>({
    queryKey: ['sa-hostel-payments', id],
    queryFn: async () => {
      const res = await apiSuperAdmin.getPayments({ hostel_id: id || '' })
      return safeExtractArray(res)
    },
    enabled: !!id,
  })
  const payments = safeExtractArray(paymentsRaw)

  // 5. Fetch rooms for this hostel
  const { data: roomsRaw = [], isLoading: loadingRooms } = useQuery<any[]>({
    queryKey: ['sa-hostel-rooms', id],
    queryFn: async () => {
      const res = await apiRooms.getAll(id || '')
      return safeExtractArray(res)
    },
    enabled: !!id,
  })
  const rooms = safeExtractArray(roomsRaw)

  if (loadingHostel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
        <span className="text-sm font-semibold">Loading hostel details…</span>
      </div>
    )
  }

  if (!hostel) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900">Hostel Not Found</h2>
        <p className="text-slate-500 text-sm">The requested hostel record could not be found or has been deleted.</p>
        <button
          onClick={() => navigate('/superadmin/hostels')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Hostels
        </button>
      </div>
    )
  }

  // --- Calculations ---
  // Occupancy details
  const occupiedBeds = students.length
  const totalBeds = hostel.total_beds || rooms.reduce((sum: number, r: any) => sum + (Number(r.capacity) || 0), 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  // Financial statistics
  const totalFeesAmount = fees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0)
  const totalPaidAmount = fees.reduce((sum: number, f: any) => sum + Number(f.paid_amount || 0), 0)
  const totalPendingAmount = fees.reduce((sum: number, f: any) => sum + Number(f.due_amount || 0), 0)

  // Filter students based on search query
  const filteredStudents = students.filter((s: any) =>
    (s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.phone || '').includes(studentSearch) ||
    (s.room_number || '').toLowerCase().includes(studentSearch.toLowerCase())
  )

  // Filter fees / payments for finance logs search
  const filteredFees = fees.filter((f: any) =>
    (f.student_name || '').toLowerCase().includes(financeSearch.toLowerCase()) ||
    (f.status || '').toLowerCase().includes(financeSearch.toLowerCase())
  )

  const filteredPayments = payments.filter((p: any) =>
    (p.student_name || '').toLowerCase().includes(financeSearch.toLowerCase()) ||
    (p.payment_method || '').toLowerCase().includes(financeSearch.toLowerCase())
  )

  const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <button
          onClick={() => navigate('/superadmin/hostels')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> BACK TO PLATFORM HOSTELS
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{hostel.hostel_name || hostel.name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                hostel.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <ShieldCheck className="h-3.5 w-3.5" /> {hostel.is_active ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-slate-400" /> {hostel.address_line1 || hostel.address}, {hostel.city}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hostel Code:</span>
            <span className="text-sm font-black text-slate-900">{hostel.hostel_code}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Rooms', value: rooms.length, sub: 'Configured rooms', icon: Building2, color: 'bg-blue-50 text-blue-600' },
          { label: 'Bed Capacity', value: `${occupiedBeds} / ${totalBeds}`, sub: `${occupancyRate}% Occupied`, icon: Bed, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Generated', value: fmt(totalFeesAmount), sub: 'Generated fees', icon: IndianRupee, color: 'bg-slate-50 text-slate-700' },
          { label: 'Collected Fees', value: fmt(totalPaidAmount), sub: 'Paid in full/partially', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Pending Collection', value: fmt(totalPendingAmount), sub: 'Due balance', icon: CreditCard, color: 'bg-rose-50 text-rose-600' }
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{card.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">{card.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'rooms', label: `Rooms & Beds (${rooms.length})` },
          { id: 'students', label: `Resident Students (${students.length})` },
          { id: 'finances', label: 'Finances & Ledger' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`py-3 px-1 font-bold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 lg:col-span-2">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" /> General Hostel Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Code / Abbreviation</span>
                  <p className="font-bold text-slate-800 mt-1">{hostel.hostel_code || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">City / Region</span>
                  <p className="font-bold text-slate-800 mt-1">{hostel.city || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Contact Email</span>
                  <p className="font-bold text-slate-850 mt-1 break-all">{hostel.email || hostel.contact_email || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <p className="font-bold text-slate-800 mt-1">{hostel.phone || hostel.contact_phone || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Address Details</span>
                  <p className="font-medium text-slate-800 mt-1">{hostel.address_line1 || hostel.address || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Registration Date</span>
                  <p className="font-medium text-slate-800 mt-1 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {hostel.created_at ? new Date(hostel.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Owner Info */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-600" /> Owner Details
                </h3>
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                      {hostel.owner_name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{hostel.owner_name || 'No Owner'}</p>
                      <p className="text-xs text-slate-400 uppercase font-semibold">Tenant Administrator</p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{hostel.owner_email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{hostel.owner_phone || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Level */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" /> Platform Subscription
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-800">SaaS Plan</span>
                    <span className={`font-bold border px-2.5 py-0.5 rounded-full text-xs ${
                      hostel.subscription_status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : hostel.subscription_status === 'trialing'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : hostel.subscription_status === 'expired'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {(hostel.subscription_status === 'trialing' ? 'Free Trial' : (hostel.subscription_status || 'Trialing')).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      <span>{hostel.subscription_billing_cycle === 'yearly' ? 'Yearly Base' : 'Monthly Base'}</span>
                      <span className="text-slate-900">
                        ₹{Number(hostel.subscription_price || 999).toLocaleString('en-IN')}/{hostel.subscription_billing_cycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${
                        hostel.subscription_status === 'active' 
                          ? 'bg-emerald-500' 
                          : hostel.subscription_status === 'trialing' 
                          ? 'bg-indigo-500' 
                          : 'bg-rose-500'
                      }`} style={{ width: '100%' }} />
                    </div>
                  </div>
                  {hostel.subscription_next_billing_date && (
                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                      <span>Next Bill Date:</span>
                      <span className="font-bold text-slate-700">
                        {new Date(hostel.subscription_next_billing_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <span>Hostel Status:</span>
                    <span className={hostel.is_active ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                      {hostel.is_active ? 'Good Standing' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS & BEDS */}
        {activeTab === 'rooms' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Live Room & Bed Matrix</h2>
                <p className="text-xs text-slate-400 mt-0.5">Interactive list of rooms and beds configured for this hostel</p>
              </div>
              <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Maintenance</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>Occupied</span>
              </div>
            </div>

            {loadingRooms ? (
              <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="text-sm">Fetching room matrix…</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Bed className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No rooms configured in this hostel profile.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  rooms.reduce((acc: any, room: any) => {
                    const floorName = room.floor ? room.floor.trim() : 'Ground Floor'
                    if (!acc[floorName]) acc[floorName] = []
                    acc[floorName].push(room)
                    return acc
                  }, {}) as Record<string, any>
                ).map(([floor, floorRooms]: any) => (
                  <div key={floor} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                      <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        {floor}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{floorRooms.length} Rooms</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {floorRooms.map((room: any) => {
                        const bedList = typeof room.beds === 'string' ? JSON.parse(room.beds) : (room.beds || [])
                        return (
                          <div key={room.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50 shadow-sm relative group hover:border-slate-300 transition">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-slate-800 text-sm">Room {room.room_number}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase bg-white px-1.5 py-0.5 rounded border border-slate-100">{room.type}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {bedList
                                .filter((b: any) => b && b.bed_number)
                                .map((bed: any) => (
                                  <div
                                    key={bed.id || Math.random()}
                                    title={`Bed ${bed.bed_number || 'Unknown'} - ${bed.status || 'Unknown'}`}
                                    className={`flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold border transition ${
                                      bed.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      bed.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      'bg-slate-200 text-slate-450 border-slate-300 shadow-inner'
                                    }`}
                                  >
                                    {(bed.bed_number || '').replace(/[^0-9]/g, '') || (bed.bed_number || '').charAt(0) || '?'}
                                  </div>
                                ))}
                            </div>
                            <div className="mt-3 w-full bg-slate-200 h-1 rounded-full overflow-hidden flex">
                              {bedList
                                .filter((b: any) => b && b.id)
                                .map((bed: any, idx: number) => (
                                  <div
                                    key={bed.id || idx}
                                    className={`h-full flex-1 ${bed.status === 'available' ? 'bg-transparent' : bed.status === 'maintenance' ? 'bg-amber-400' : 'bg-slate-400'}`}
                                    style={{ marginLeft: idx > 0 ? '1px' : '0' }}
                                  />
                                ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RESIDENT STUDENTS */}
        {activeTab === 'students' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Resident Students Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">Active resident boarders enrolled in this hostel</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students…"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="text-sm">Fetching student roster…</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No matching student records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-450 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Contact Info</th>
                      <th className="px-6 py-4">Assigned Room / Bed</th>
                      <th className="px-6 py-4">Enrollment Date</th>
                      <th className="px-6 py-4 text-right">ID Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8.5 w-8.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {s.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{s.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {s.id_number || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="text-slate-800 font-semibold">{s.email}</p>
                          <p className="text-xs text-slate-400">{s.phone}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 font-bold rounded-lg text-xs">
                            <Bed className="h-3.5 w-3.5" /> Room {s.room_number || 'Unassigned'} / {s.bed_number || 'B?'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs font-semibold">
                          {s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {s.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINANCES & LEDGER */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            {/* Header controls */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Hostel Ledger & Audit</h2>
                <p className="text-xs text-slate-400 mt-0.5">Logs of generated invoices, pending dues, and payment collections</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ledger by student…"
                  value={financeSearch}
                  onChange={e => setFinanceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generated Invoices / Fees */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Fee Invoices Log</h3>
                </div>
                {loadingFees ? (
                  <div className="flex items-center justify-center h-48 text-slate-450 gap-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span className="text-xs">Loading invoices…</span>
                  </div>
                ) : filteredFees.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex-1">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">No fee invoices recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-450 font-bold uppercase border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Month</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredFees.map((f: any) => (
                          <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">{f.student_name}</td>
                            <td className="px-4 py-3 text-slate-450 font-semibold">
                              {f.month ? new Date(f.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{fmt(f.amount)}</p>
                              {Number(f.due_amount) > 0 && <p className="text-[10px] text-rose-500 font-bold">{fmt(f.due_amount)} due</p>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                                f.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                f.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Received Payments */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Payments Received Ledger</h3>
                </div>
                {loadingPayments ? (
                  <div className="flex items-center justify-center h-48 text-slate-450 gap-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span className="text-xs">Loading payments…</span>
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex-1">
                    <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">No payments registered.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-450 font-bold uppercase border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3 text-right">Received Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{p.student_name}</p>
                              <p className="text-[9px] text-slate-400 break-all">{p.student_email}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-semibold uppercase">{p.payment_method}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">{fmt(p.amount)}</td>
                            <td className="px-4 py-3 text-slate-400 text-right">
                              {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default SuperAdminHostelDetails
