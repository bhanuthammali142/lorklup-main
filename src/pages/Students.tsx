// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, MoreVertical, FileText, Trash2, Loader2, Eye, X, CheckCircle2, AlertCircle, Building2, Phone, Calendar, CreditCard, ImageOff, Upload } from 'lucide-react'
import { AddStudentModal } from '../components/AddStudentModal'
import { ImportStudentsModal } from '../components/ImportStudentsModal'
import { useAuth } from '../lib/AuthContext'
import { getOrCreateHostel, getStudents, deleteStudent, exportStudentsCSV } from '../lib/api'
import type { Student } from '../types'
import toast from 'react-hot-toast'
import { Skeleton } from '../components/Skeleton'
import { AnimateView } from '../components/AnimateView'
export function Students() {
  const { user } = useAuth()
  const [hostelId, setHostelId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)


  // React Query: fetch students
  const queryClient = useQueryClient()
  const {
    data: studentsData = [],
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['students', hostelId],
    queryFn: () => hostelId ? getStudents(hostelId) : Promise.resolve([]),
    enabled: !!hostelId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const loading = isLoading || isFetching

  useEffect(() => {
    if (!user) return
    getOrCreateHostel(user.id).then(h => {
      if (h) setHostelId(h.id)
    })
  }, [user])

  const handleDelete = async (id: string, name: string) => {
    try {
      let msg = `Delete student "${name}"? This will also free their bed.`
      if (!window.confirm(msg)) return

      await deleteStudent(id)
      toast.success(`${name} removed and bed freed.`)
      // Invalidate and refetch students
      queryClient.invalidateQueries({ queryKey: ['students', hostelId] })
    } catch { toast.error('Failed to delete student.') }
  }

  const handleExport = () => {
    if (studentsData.length === 0) return toast.error('No students to export.')
    exportStudentsCSV(studentsData)
    toast.success(`Exported ${studentsData.length} students to CSV.`)
  }

  const filtered = studentsData
    .filter(s =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.college_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.id_number ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(s => {
      if (filterVerified === 'verified')   return s.is_verified
      if (filterVerified === 'unverified') return !s.is_verified
      return true
    })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AddStudentModal
        isOpen={isModalOpen}
        hostelId={hostelId}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); queryClient.invalidateQueries({ queryKey: ['students', hostelId] }) }}
      />

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        hostelId={hostelId}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => { setIsImportModalOpen(false); queryClient.invalidateQueries({ queryKey: ['students', hostelId] }) }}
      />

      {/* Student Profile Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right-0 duration-300" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-slate-900">Student Profile</h2>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold uppercase flex-shrink-0">
                  {selectedStudent.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedStudent.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedStudent.is_verified
                      ? <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-medium"><CheckCircle2 className="h-3 w-3" />Phone Verified</span>
                      : <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium"><AlertCircle className="h-3 w-3" />Unverified</span>
                    }
                    {(selectedStudent as any).parent_phone_verified &&
                      <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 font-medium"><CheckCircle2 className="h-3 w-3" />Parent Verified</span>
                    }
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-4">
                {[
                  { icon: Phone, label: 'Student Phone', value: selectedStudent.phone },
                  { icon: Phone, label: 'Parent Phone', value: selectedStudent.parent_phone ?? 'Not provided' },
                  { icon: CreditCard, label: 'Aadhaar', value: selectedStudent.aadhaar_number ?? 'Not provided' },
                  { icon: Building2, label: 'College', value: selectedStudent.college_name ?? 'N/A' },
                  { icon: Building2, label: 'Branch & ID', value: `${selectedStudent.branch ?? ''} ${selectedStudent.id_number ? `(${selectedStudent.id_number})` : ''}`.trim() || 'N/A' },
                  { icon: Calendar, label: 'Joining Date', value: new Date(selectedStudent.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { icon: CreditCard, label: 'Advance Taken (Deposit)', value: `₹${Number((selectedStudent as any).advance_amount || 0).toLocaleString('en-IN')}` },
                  { icon: Calendar, label: 'Monthly Payment Date', value: (selectedStudent as any).monthly_payment_day ? `${(selectedStudent as any).monthly_payment_day} of every month` : '5th of every month' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">{label}</span>
                      <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}

                {/* Room allocation */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Allocation</span>
                    <div className="flex items-center gap-2 mt-1">
                      {(selectedStudent as any).room_number
                        ? <><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Room {(selectedStudent as any).room_number}</span>
                           <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{(selectedStudent as any).bed_number}</span></>
                        : <span className="text-sm text-slate-400">Not assigned</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Photos */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">📂 Uploaded Documents</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Aadhaar Card', url: (selectedStudent as any).aadhaar_photo },
                    { label: 'ID Card', url: (selectedStudent as any).id_card_photo },
                  ].map(({ label, url }) => (
                    <div key={label} className="border border-slate-200 rounded-xl overflow-hidden">
                      {url
                        ? <img src={url} alt={label} className="w-full h-28 object-cover" />
                        : <div className="h-28 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300">
                            <ImageOff className="h-6 w-6" />
                            <span className="text-xs">Not uploaded</span>
                          </div>
                      }
                      <div className="p-2 bg-slate-50 border-t border-slate-100 text-center text-xs font-medium text-slate-600">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => handleDelete(selectedStudent.id, selectedStudent.full_name)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">
                <Trash2 className="h-4 w-4" /> Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-500 mt-1">Manage admissions, room allocations and records.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <Upload className="h-4 w-4" /> Import Bulk
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />Add Student
          </button>
        </div>
      </div>

      <div className="card-premium">
        <div className="border-b border-slate-100 p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by name, phone, college or ID..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <select
                  value={filterVerified}
                  onChange={e => setFilterVerified(e.target.value as typeof filterVerified)}
                  className="flex-1 sm:flex-none appearance-none border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 bg-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Students</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={handleExport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <FileText className="h-4 w-4" />Export CSV
              </button>
            </div>
          </div>
        </div>

        <AnimateView
          isLoading={loading}
          fallback={
            <div className="w-full">
              {/* Mobile Skeleton */}
              <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/30">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <Skeleton className="h-8 w-full rounded" />
                      <Skeleton className="h-8 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Skeleton */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">College & Branch</th>
                      <th className="px-6 py-4">Allocation</th>
                      <th className="px-6 py-4">Join Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i}>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-3 w-24 rounded" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-28 rounded" />
                            <Skeleton className="h-3 w-20 rounded" />
                          </div>
                        </td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-8 rounded ml-auto" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <p className="text-lg font-medium">{searchTerm ? 'No matches found' : 'No students yet'}</p>
              <p className="text-sm">{!searchTerm && 'Click "Add Student" to get started.'}</p>
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/30">
              {filtered.map((student) => (
                <div key={student.id} onClick={() => setSelectedStudent(student)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 cursor-pointer hover:border-blue-300 transition-colors">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold uppercase flex-shrink-0">
                         {student.full_name.charAt(0)}
                       </div>
                       <div className="flex flex-col min-w-[120px]">
                         <span className="font-semibold text-slate-900 truncate">{student.full_name}</span>
                         <span className="text-xs text-slate-500 truncate">{student.id_number ? `${student.id_number} · ` : ''}{student.phone}</span>
                       </div>
                     </div>
                     {student.is_verified
                        ? <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />Verified</span>
                        : <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="h-3 w-3" />Pending</span>
                     }
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                     <div className="flex flex-col">
                       <span className="text-slate-400 font-medium">College</span>
                       <span className="text-slate-700 font-semibold truncate">{student.college_name || '—'}</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="text-slate-400 font-medium">Room</span>
                       <span className="text-slate-700 font-semibold truncate">
                         {(student as any).room_number ?? 'Unassigned'} {(student as any).bed_number ? `· Bed ${(student as any).bed_number}` : ''}
                       </span>
                     </div>
                   </div>
                   <div className="flex justify-end gap-2 pt-2">
                     <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(student) }} className="p-1.5 px-3 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">View</button>
                     <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id, student.full_name) }} className="p-1.5 px-3 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg">Delete</button>
                   </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="w-full text-left text-sm whitespace-nowrap hidden md:table">
              <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">College & Branch</th>
                  <th className="px-6 py-4">Allocation</th>
                  <th className="px-6 py-4">Join Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold uppercase flex-shrink-0">
                          {student.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900">{student.full_name}</span>
                          <span className="text-xs text-slate-500">{student.id_number ? `${student.id_number} · ` : ''}{student.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{student.college_name || '—'}</span>
                        <span className="text-xs text-slate-500">{student.branch || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(student as any).room_number
                          ? <><span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-medium border border-slate-200">Room {(student as any).room_number}</span>
                             {(student as any).bed_number && <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-medium border border-slate-200">{(student as any).bed_number}</span>}</>
                          : <span className="text-xs text-slate-400">Unassigned</span>
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(student.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      {student.is_verified
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />Verified</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="h-3 w-3" />Pending</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudent(student)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-md" title="View Profile"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(student.id, student.full_name)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><MoreVertical className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </AnimateView>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {filtered.length} of {studentsData.length} students</span>
          {studentsData.length > 0 && (
            <button onClick={handleExport} className="text-blue-600 hover:underline text-xs">Download CSV</button>
          )}
        </div>
      </div>
    </div>
  )
}
