// @ts-nocheck
/**
 * AddHostelModal.tsx (super admin) - FIXED VERSION
 * 
 * FIXES:
 * 1. Super Admin can skip food menu step
 * 2. Removed UUID dependency, uses INT AUTO_INCREMENT
 * 3. Added role detection
 * 4. Food menu is optional for super admin
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Building2, User, Bed, UtensilsCrossed,
  Eye, EyeOff, CheckCircle2, Loader2, ChevronRight, ChevronLeft, Copy, Check, AlertTriangle, SkipForward
} from 'lucide-react'
import { createHostelWithOwner } from '../../lib/adminApi'
import { CameraCapture } from '../../components/CameraCapture'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner']

const STEPS = [
  { id: 1, label: 'Hostel Info',   icon: Building2 },
  { id: 2, label: 'Owner Details', icon: User },
  { id: 3, label: 'Rooms & Beds',  icon: Bed },
  { id: 4, label: 'Food Menu',     icon: UtensilsCrossed },
]

// FIX: Detect if user is super admin
const getUserRole = () => {
  try {
    const user = localStorage.getItem('hostelOS_user')
    if (user) {
      const parsed = JSON.parse(user)
      return parsed.role || 'admin'
    }
  } catch (e) {
    console.error('Error getting user role:', e)
  }
  return 'admin'
}

const isSuperAdmin = getUserRole() === 'super_admin'

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const DEFAULT_MENU = Object.fromEntries(
  DAYS.map(day => [day, Object.fromEntries(MEALS.map(m => [m, '']))])
)

export function AddHostelModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{
    email: string
    password: string
    isExistingUser?: boolean
    summary?: string
  } | null>(null)
  const [deployError, setDeployError] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)

  const [hostelName, setHostelName] = useState('')
  const [address, setAddress] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerProfilePhoto, setOwnerProfilePhoto] = useState('')

  const [floors, setFloors] = useState<
    { floorName: string; rooms: { roomNumber: string; type: 'AC' | 'Non-AC'; beds: number; monthlyFee: number }[] }[]
  >([{ floorName: 'Ground Floor', rooms: [{ roomNumber: '101', type: 'Non-AC', beds: 3, monthlyFee: 5000 }] }])

  const [menu, setMenu] = useState<Record<string, Record<string, string>>>(DEFAULT_MENU)

  const addFloor = () =>
    setFloors(f => [
      ...f,
      { floorName: `Floor ${f.length + 1}`, rooms: [{ roomNumber: `${f.length + 1}01`, type: 'Non-AC', beds: 3, monthlyFee: 5000 }] },
    ])

  const addRoom = (fi: number) =>
    setFloors(f =>
      f.map((fl, i) =>
        i === fi
          ? {
              ...fl,
              rooms: [
                ...fl.rooms,
                {
                  roomNumber: `${fi + 1}${String(fl.rooms.length + 1).padStart(2, '0')}`,
                  type: 'Non-AC' as const,
                  beds: 3,
                  monthlyFee: 5000,
                },
              ],
            }
          : fl
      )
    )

  const removeRoom = (fi: number, ri: number) =>
    setFloors(f =>
      f.map((fl, i) => (i === fi ? { ...fl, rooms: fl.rooms.filter((_, j) => j !== ri) } : fl))
    )

  const updateFloor = (fi: number, key: string, val: any) =>
    setFloors(f => f.map((fl, i) => (i === fi ? { ...fl, [key]: val } : fl)))

  const updateRoom = (fi: number, ri: number, key: string, val: any) =>
    setFloors(f =>
      f.map((fl, i) =>
        i === fi ? { ...fl, rooms: fl.rooms.map((r, j) => (j === ri ? { ...r, [key]: val } : r)) } : fl
      )
    )

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // FIX: For super admin, make food menu optional
      const payload = {
        ownerEmail,
        ownerName,
        ownerPhone,
        ownerPassword: ownerPassword.trim() || undefined,
        hostelName,
        address,
        contactEmail,
        contactPhone,
        floors,
        // If super admin and menu is empty, send empty object
        menu: isSuperAdmin ? {} : menu,
        profilePhoto: ownerProfilePhoto,
      }
      
      const result = await createHostelWithOwner(payload)

      setDone({
        email: ownerEmail,
        password: result.credentials.password,
        summary: result.summary,
      })
      toast.success(`Hostel "${hostelName}" created!`)
    } catch (err: any) {
      console.error('Create hostel error:', err)
      toast.error(err.message || 'Failed to create hostel')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Login: ${done?.email}\nPassword: ${done?.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // FIX: Skip food menu step for super admin - adjust total steps
  const getAdjustedSteps = () => {
    if (isSuperAdmin) {
      return STEPS.filter(step => step.id !== 4) // Remove food menu step for super admin
    }
    return STEPS
  }

  const visibleSteps = getAdjustedSteps()
  const totalSteps = visibleSteps.length

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  if (deployError) {
    return (
      <ModalShell onClose={onClose}>
        <div className="p-8 text-center space-y-5">
          <div className="h-16 w-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Backend Not Connected</h2>
            <p className="text-slate-500 text-sm mt-2">
              The required Edge Function is not currently active on your Supabase instance.
              Please deploy the function to continue.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              {submitting ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={() => { onClose(); navigate('/superadmin/deploy') }}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20"
            >
              Open Deploy Guide
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  if (done) {
    return (
      <ModalShell onClose={() => { onSuccess(); onClose() }}>
        <div className="p-8 text-center space-y-5">
          <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Hostel Created!</h2>
            <p className="text-slate-500 text-sm mt-1">Share these credentials with the hostel owner.</p>
            {done.summary && <p className="text-xs text-slate-400 font-semibold mt-1">{done.summary}</p>}
          </div>
          <div className="bg-slate-900 text-left rounded-2xl p-5 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Email</p>
              <p className="text-white font-bold mt-0.5">{done.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temporary Password</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-white font-bold font-mono tracking-wider">
                  {showPass ? done.password : '••••••••••••'}
                </p>
                <button onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-white transition">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={copyCredentials}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Credentials</>}
          </button>
          <button
            onClick={() => { onSuccess(); onClose() }}
            className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Done
          </button>
        </div>
      </ModalShell>
    )
  }

  const canNext = () => {
    if (step === 1) return hostelName.trim() && address.trim()
    if (step === 2) return ownerName.trim() && ownerEmail.trim() && ownerPhone.trim() && ownerProfilePhoto
    if (step === 3) return floors.length > 0 && floors.every(f => f.rooms.length > 0)
    // Step 4 (food menu) - always can proceed for super admin, or if menu filled for regular admin
    if (step === 4) {
      if (isSuperAdmin) return true
      // For regular admin, check if at least some menu items are filled
      return Object.values(menu).some(day => 
        Object.values(day).some(meal => meal && meal.trim())
      )
    }
    return true
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Add New Hostel</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Step {step} of {totalSteps}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
          <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 pt-4 gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {visibleSteps.map(s => {
          const Icon = s.icon
          const active = step === s.id
          const isDone = step > s.id
          return (
            <button
              key={s.id}
              onClick={() => isDone && setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition whitespace-nowrap border-b-2 -mb-px ${active ? 'border-indigo-600 text-indigo-600' : isDone ? 'border-emerald-400 text-emerald-600 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-t-lg' : 'border-transparent text-slate-400 dark:text-slate-500'}`}
            >
              <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className={active || isDone ? "block" : "hidden sm:block"}>
                {s.label}
              </span>
              {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 hidden sm:block" />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <SectionTitle>Hostel information</SectionTitle>
            <Field label="Hostel name *" value={hostelName} onChange={setHostelName} placeholder="e.g. Sri Ram Boys Hostel" />
            <Field label="Address *" value={address} onChange={setAddress} placeholder="Full address with city and PIN" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact email" value={contactEmail} onChange={setContactEmail} placeholder="hostel@email.com" type="email" />
              <Field label="Contact phone" value={contactPhone} onChange={setContactPhone} placeholder="9XXXXXXXXX" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <SectionTitle>Owner / admin details</SectionTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3">
              A login account will be created with the email below. The owner should change the password after first login.
            </p>
            <Field label="Full name *" value={ownerName} onChange={setOwnerName} placeholder="Owner full name" />
            <Field label="Email address *" value={ownerEmail} onChange={setOwnerEmail} placeholder="owner@email.com" type="email" />
            <Field label="Phone number *" value={ownerPhone} onChange={setOwnerPhone} placeholder="9XXXXXXXXX" />
            <Field label="Login Password" value={ownerPassword} onChange={setOwnerPassword} placeholder="Leave empty to auto-generate" type="text" />
            
            <div className="pt-2">
              <CameraCapture
                onPhotoSelected={(base64) => setOwnerProfilePhoto(base64)}
                label="Profile Photo * (Mandatory)"
                shape="circle"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <SectionTitle>Floors, rooms & beds</SectionTitle>
              <button onClick={addFloor} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition">
                + Add floor
              </button>
            </div>
            {floors.map((floor, fi) => (
              <div key={fi} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                  <input
                    value={floor.floorName}
                    onChange={e => updateFloor(fi, 'floorName', e.target.value)}
                    className="bg-transparent font-bold text-slate-900 dark:text-slate-100 text-sm outline-none w-40"
                  />
                  <button onClick={() => addRoom(fi)} className="text-xs font-bold text-indigo-600 hover:text-indigo-850 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg transition">
                    + Add room
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {floor.rooms.map((room, ri) => (
                    <div key={ri} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 items-end bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Room No.</p>
                        <input
                          value={room.roomNumber}
                          onChange={e => updateRoom(fi, ri, 'roomNumber', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-400 outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                        <select
                          value={room.type}
                          onChange={e => updateRoom(fi, ri, 'type', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-400 outline-none"
                        >
                          <option>Non-AC</option>
                          <option>AC</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Beds</p>
                        <input
                          type="number" min={1} max={10}
                          value={room.beds}
                          onChange={e => updateRoom(fi, ri, 'beds', Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-400 outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">₹/month</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={0}
                            value={room.monthlyFee}
                            onChange={e => updateRoom(fi, ri, 'monthlyFee', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-400 outline-none"
                          />
                          {floor.rooms.length > 1 && (
                            <button
                              onClick={() => removeRoom(fi, ri)}
                              className="text-rose-400 hover:text-rose-600 transition flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 p-3 text-xs text-indigo-700 dark:text-indigo-400 font-semibold rounded-xl">
              Total: {floors.length} floors · {floors.reduce((a, f) => a + f.rooms.length, 0)} rooms · {floors.reduce((a, f) => a + f.rooms.reduce((b, r) => b + r.beds, 0), 0)} beds
            </div>
          </div>
        )}

        {/* FIX: Food menu step - show skip option for super admin */}
        {step === 4 && !isSuperAdmin && (
          <div className="space-y-4">
            <SectionTitle>Weekly food menu</SectionTitle>
            <p className="text-xs text-slate-500">The hostel owner can edit this anytime from their dashboard.</p>
            {DAYS.map(day => (
              <div key={day} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{day}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  {MEALS.map(meal => (
                    <div key={meal}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{meal}</p>
                      <input
                        value={menu[day][meal]}
                        onChange={e => setMenu(m => ({ ...m, [day]: { ...m[day], [meal]: e.target.value } }))}
                        placeholder="e.g. Idli, Sambar"
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FIX: Skip food menu message for super admin */}
        {step === 4 && isSuperAdmin && (
          <div className="text-center py-12 space-y-4">
            <UtensilsCrossed className="h-16 w-16 text-indigo-300 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800">Food Menu</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Food menu can be added later by the hostel owner from their dashboard.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              ⚡ Super Admin: You can skip this step. The hostel owner will set up the food menu.
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <button onClick={handleBack} disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        
        {step < totalSteps ? (
          <button onClick={handleNext} disabled={!canNext()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40 shadow-lg shadow-indigo-500/20">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60 shadow-lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? 'Creating...' : 'Create hostel'}
          </button>
        )}
      </div>
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Add New Hostel"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800/85 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
        {children}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{children}</h3>
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition placeholder:text-slate-300 dark:placeholder:text-slate-700"
      />
    </div>
  )
}