// @ts-nocheck
/**
 * StudentComplaints — Fixed: removed supabase, uses REST API
 */
import React, { useEffect, useState, useRef } from 'react'
import {
  MessageSquareWarning, Plus, Send, Loader2, Clock,
  Wrench, CheckCircle2, X, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { apiComplaints } from '../../lib/api-client'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  open:          { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock,        label: 'Pending' },
  pending:       { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock,        label: 'Pending' },
  'in_progress': { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Wrench,       label: 'In Progress' },
  resolved:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, label: 'Resolved' },
}

const CATEGORY_OPTIONS = [
  'Maintenance / Repair',
  'Plumbing',
  'Electrical',
  'Cleanliness / Hygiene',
  'Food Quality',
  'Noise / Disturbance',
  'Security',
  'Internet / WiFi',
  'Other',
]

export function StudentComplaints() {
  const { studentData, hostelId } = useAuth()
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low')
  const [submitting, setSubmitting] = useState(false)

  const fetchComplaints = async () => {
    if (!hostelId) return
    setLoading(true)
    try {
      const all: any[] = await apiComplaints.getAll(hostelId)
      // Filter to only this student's complaints
      const mine = all.filter(c => c.student_id === studentData?.id)
      setComplaints(mine)
    } catch (err) {
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentData?.id && hostelId) fetchComplaints()
  }, [studentData, hostelId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentData || !hostelId || !title || !description) return
    setSubmitting(true)

    try {
      await apiComplaints.add({
        hostel_id: hostelId,
        student_id: studentData.id,
        title: category ? `[${category}] ${title}` : title,
        description,
        priority,
        status: 'open',
      })

      toast.success('Complaint submitted! Management will review it shortly.')
      setTitle('')
      setCategory('')
      setDescription('')
      setPriority('low')
      setShowForm(false)
      fetchComplaints()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit complaint')
    } finally {
      setSubmitting(false)
    }
  }

  if (!studentData) return null

  const pending = complaints.filter(c => ['pending', 'open'].includes(c.status)).length
  const inProgress = complaints.filter(c => c.status === 'in_progress').length
  const resolved = complaints.filter(c => c.status === 'resolved').length

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquareWarning className="h-7 w-7 text-rose-500" /> My Complaints
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Report issues and track resolution status.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/20 transition active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" /> Raise Issue
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',     value: pending,    color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'In Progress', value: inProgress, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
          { label: 'Resolved',    value: resolved,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
          <Loader2 className="animate-spin h-5 w-5" /> Loading...
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-50" />
          <p className="font-bold text-slate-600 text-lg">All clear!</p>
          <p className="text-slate-400 text-sm mt-1">No complaints submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map(c => {
            const style = STATUS_STYLES[c.status] || STATUS_STYLES.open
            const Icon = style.icon
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Submitted {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                      <Icon className="h-3 w-3" /> {style.label}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                  {c.priority && c.priority !== 'low' && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <AlertTriangle className={`h-3 w-3 ${c.priority === 'high' ? 'text-rose-500' : 'text-amber-500'}`} />
                      <span className={`text-[10px] font-bold uppercase ${c.priority === 'high' ? 'text-rose-600' : 'text-amber-600'}`}>
                        {c.priority} priority
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Complaint Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Report an Issue</h3>
                <p className="text-slate-400 text-xs mt-0.5">Describe the problem clearly</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-600 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="">Select a category...</option>
                    {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Issue Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. AC not working in room"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Priority Level</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition ${
                          priority === p
                            ? p === 'high' ? 'bg-rose-600 border-rose-600 text-white'
                              : p === 'medium' ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-slate-700 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Description *</label>
                  <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue in detail: what, where, when..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : <><Send className="h-4 w-4" /> Submit Complaint</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
