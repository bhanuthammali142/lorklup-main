import React from 'react'
import { User, LogOut, FileText, Phone, Building, Bed, GraduationCap, Calendar, Hash, Mail, Shield } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

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

  if (!studentData) return null

  const maskedAadhaar = studentData.aadhaar_number
    ? `XXXX XXXX ${studentData.aadhaar_number.slice(-4)}`
    : null

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <User className="h-8 w-8 text-blue-600" /> My Profile
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Your personal details and hostel information.</p>
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
                  <Bed className="h-3 w-3" /> {studentData.rooms?.floor ? `${studentData.rooms.floor} · ` : ''}Room {studentData.rooms?.room_number ?? 'N/A'} · Bed {studentData.beds?.bed_number ?? 'N/A'}
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
                  <p className="text-3xl font-black">{studentData.rooms?.floor ?? 'N/A'}</p>
                </div>
                <div className="w-px h-12 bg-slate-700 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-center sm:justify-start gap-1">
                    Room <span className="ml-1 bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-300">{studentData.rooms?.type ?? 'Unknown'}</span>
                  </p>
                  <p className="text-3xl font-black">{studentData.rooms?.room_number ?? 'N/A'}</p>
                </div>
                <div className="w-px h-12 bg-slate-700 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Bed</p>
                  <p className="text-3xl font-black text-blue-400">{studentData.beds?.bed_number ?? 'N/A'}</p>
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

          {/* Sign Out */}
          <div className="pt-2 border-t border-slate-100">
            <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 font-bold py-3 px-4 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100">
              <LogOut className="h-5 w-5" /> Sign Out from Device
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
