// @ts-nocheck
/**
 * AddStudentModal.tsx — Fixed:
 * - Removed calls to undefined sendPhoneOTP/verifyPhoneOTP functions
 * - OTP section simplified to "verification bypassed" since no phone auth backend
 * - All logic uses REST API via api.ts
 */
import React, { useEffect, useState, useRef } from 'react'
import { X, CheckCircle2, ChevronRight, Check, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '../lib/utils'
import { addStudent, getRoomsWithBeds } from '../lib/api'
import toast from 'react-hot-toast'

interface AddStudentModalProps {
  isOpen: boolean
  hostelId: string | null
  onClose: () => void
  onSuccess: () => void
}

interface RoomOption {
  id: string
  room_number: string
  monthly_fee: number
  beds: { id: string; bed_number: string; status: string }[]
}

export function AddStudentModal({ isOpen, hostelId, onClose, onSuccess }: AddStudentModalProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    parent_phone: '',
    email: '',
    id_number: '',
    college_name: '',
    branch: '',
    joining_date: new Date().toISOString().split('T')[0],
    room_id: '',
    bed_id: '',
    advance_amount: '0',
    monthly_payment_day: '5',
  })

  useEffect(() => {
    if (hostelId && step === 3) {
      getRoomsWithBeds(hostelId).then(r => setRooms(r as RoomOption[]))
    }
  }, [hostelId, step])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { resetForm(); onClose() }
    }
    document.addEventListener('keydown', onKeyDown)
    firstFocusRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!hostelId) return
    if (!form.full_name) return toast.error('Full name is required.')
    if (!form.phone) return toast.error('Phone number is required.')
    if (!form.email) return toast.error('Email address is required.')
    if (!form.room_id || !form.bed_id) return toast.error('Room and bed assignment is required.')

    setSaving(true)
    try {
      const response = await addStudent({
        hostel_id: hostelId,
        full_name: form.full_name,
        phone: form.phone,
        parent_phone: form.parent_phone || null,
        email: form.email || undefined,
        id_number: form.id_number || null,
        college_name: form.college_name || null,
        branch: form.branch || null,
        joining_date: form.joining_date,
        room_id: form.room_id || null,
        bed_id: form.bed_id || null,
        advance_amount: Number(form.advance_amount || 0),
        monthly_payment_day: Number(form.monthly_payment_day || 5),
        is_verified: false,
      })

      if (response.credentials) {
        setCredentials(response.credentials)
        setStep(4)
      } else {
        toast.success(`${form.full_name} added successfully!`)
        onSuccess()
        resetForm()
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save student.')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setCredentials(null)
    setForm({
      full_name: '', phone: '', parent_phone: '', email: '',
      id_number: '', college_name: '', branch: '',
      joining_date: new Date().toISOString().split('T')[0],
      room_id: '', bed_id: '',
      advance_amount: '0',
      monthly_payment_day: '5',
    })
  }

  const availableBeds = rooms.find(r => r.id === form.room_id)?.beds.filter(b => b.status === 'available') ?? []
  const selectedRoomFee = rooms.find(r => r.id === form.room_id)?.monthly_fee ?? 0

  const STEPS = [
    { num: 1, label: 'Personal Details' },
    { num: 2, label: 'Verification' },
    { num: 3, label: 'Room Allocation' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Add New Student"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-slate-100 p-5 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {step === 4 ? 'Student Created!' : 'Add New Student'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {step === 4 ? 'Share credentials with the student.' : `Step ${step} of 3`}
            </p>
          </div>
          <button
            ref={firstFocusRef}
            onClick={() => { if (step === 4) onSuccess(); resetForm(); onClose() }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={cn('flex items-center gap-2', step >= s.num ? 'text-blue-600 font-semibold' : 'text-slate-400')}>
                  <div className={cn(
                    'h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border',
                    step > s.num  ? 'bg-blue-600 text-white border-blue-600' :
                    step === s.num ? 'border-blue-600 bg-blue-50 text-blue-600' :
                                    'border-slate-200 bg-slate-50 text-slate-400'
                  )}>
                    {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                  </div>
                  <span className="text-sm hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">

          {/* STEP 1 — Personal Details */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Full Name *</label>
                  <input
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Student Phone *</label>
                  <input
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Parent Phone</label>
                  <input
                    value={form.parent_phone}
                    onChange={e => set('parent_phone', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="+91"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="student@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">ID / Roll No.</label>
                  <input
                    value={form.id_number}
                    onChange={e => set('id_number', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="CST-24-001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">College</label>
                  <input
                    value={form.college_name}
                    onChange={e => set('college_name', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="JNTUH"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Branch</label>
                  <input
                    value={form.branch}
                    onChange={e => set('branch', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="CSE"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Joining Date</label>
                <input
                  type="date"
                  value={form.joining_date}
                  onChange={e => set('joining_date', e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2 — Verification (simplified, no phone OTP backend) */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Phone Verification Skipped</p>
                    <p className="text-xs text-amber-700 mt-1">
                      SMS OTP verification requires a phone auth provider integration.
                      The student will be marked as <strong>unverified</strong> until manually verified.
                      You can verify them later from the Students page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700">Student Details Summary</p>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium">Name:</span> {form.full_name || '—'}</p>
                  <p><span className="font-medium">Phone:</span> {form.phone || '—'}</p>
                  <p><span className="font-medium">Email:</span> {form.email || 'Not provided'}</p>
                  <p><span className="font-medium">College:</span> {form.college_name || '—'}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                Click <strong>Continue</strong> to proceed to room allocation.
              </div>
            </div>
          )}

          {/* STEP 3 — Room Allocation */}
          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <span className="text-lg">🏠</span>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Auto Fee Assignment</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Selecting a room will automatically create this month's fee record based on the room's monthly rate.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Select Room</label>
                  <select
                    value={form.room_id}
                    onChange={e => { set('room_id', e.target.value); set('bed_id', '') }}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">— No room —</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} — ₹{Number(r.monthly_fee).toLocaleString('en-IN')}/mo
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Select Bed</label>
                  <select
                    value={form.bed_id}
                    onChange={e => set('bed_id', e.target.value)}
                    disabled={!form.room_id}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">— No bed —</option>
                    {availableBeds.map(b => (
                      <option key={b.id} value={b.id}>{b.bed_number} (Available)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Advance Taken (Deposit) (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={form.advance_amount}
                    onChange={e => set('advance_amount', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Monthly Payment Date</label>
                  <select
                    value={form.monthly_payment_day}
                    onChange={e => set('monthly_payment_day', e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {form.room_id && selectedRoomFee > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-800">Fee will be auto-created</p>
                  <p className="text-emerald-700 text-sm mt-1">
                    Amount: <strong>₹{Number(selectedRoomFee).toLocaleString('en-IN')}</strong> · Month:{' '}
                    <strong>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</strong> · Status: Pending
                  </p>
                </div>
              )}
              {form.room_id && availableBeds.length === 0 && (
                <p className="text-sm text-rose-500">No available beds in this room.</p>
              )}
            </div>
          )}

          {/* STEP 4 — Credentials */}
          {step === 4 && credentials && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="w-full">
                <h3 className="text-lg font-bold text-slate-900">Admission Completed!</h3>
                <p className="text-sm text-slate-500 mt-1 pb-4">Share these credentials with the student.</p>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    Ask the student to change this password immediately after first login.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3 shadow-inner">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Email / Login</span>
                    <div className="mt-1 font-mono text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 flex justify-between">
                      {credentials.email}
                      <button
                        onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success('Copied!') }}
                        className="text-blue-600 text-xs font-bold uppercase hover:underline"
                      >Copy</button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Temporary Password</span>
                    <div className="mt-1 font-mono text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-rose-600 flex justify-between">
                      {credentials.password}
                      <button
                        onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success('Copied!') }}
                        className="text-blue-600 text-xs font-bold uppercase hover:underline"
                      >Copy</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          {step < 4 && (
            <button
              onClick={() => step > 1 ? setStep(step - 1) : (resetForm(), onClose())}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!form.full_name || !form.phone || !form.email)}
              className="btn-primary min-w-[120px] ml-auto disabled:opacity-40"
            >
              Continue →
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary min-w-[150px] flex items-center justify-center gap-2 ml-auto"
            >
              {saving ? <><Loader2 className="animate-spin h-4 w-4" /> Saving...</> : 'Save Admission'}
            </button>
          )}
          {step === 4 && (
            <button onClick={() => { onSuccess(); resetForm() }} className="btn-primary min-w-[150px] w-full">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
