// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MessageCircle, FileDown, CheckCircle2, Clock, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'
import { getOrCreateHostel, getFees, processPayment, autoMarkOverdue, generateBulkFees } from '../lib/api'
import { apiPayments } from '../lib/api-client'
import { Skeleton } from '../components/Skeleton'
import { AnimateView } from '../components/AnimateView'
import toast from 'react-hot-toast'

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function getDaysLate(dueDateStr: string) {
  if (!dueDateStr) return 0
  const diffTime = Date.now() - new Date(dueDateStr).getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function Fees() {
  const { user } = useAuth()
  const [hostelId, setHostelId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const [collectingFee, setCollectingFee] = useState<any | null>(null)
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0])
  const [collectionAmount, setCollectionAmount] = useState<number>(0)
  const [savingMsg, setSavingMsg] = useState(false)

  const [verifyingFee, setVerifyingFee] = useState<any | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyingMsg, setVerifyingMsg] = useState(false)

  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genMonthDate, setGenMonthDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [genDueDate, setGenDueDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 5).toISOString().split('T')[0]
  })

  const queryClient = useQueryClient()

  // FIXED: renamed local var to feesData throughout, removed stale `fees` reference
  const { data: feesData = [], isLoading, isFetching } = useQuery({
    queryKey: ['fees', hostelId],
    queryFn: async () => {
      if (!hostelId) return []
      await autoMarkOverdue(hostelId)
      return getFees(hostelId)
    },
    enabled: !!hostelId,
    staleTime: 1000 * 60 * 2,
  })

  useEffect(() => {
    if (!user) return
    getOrCreateHostel(user.id).then(h => { if (h) setHostelId(h.id) })
  }, [user])

  const handleMarkPaid = async () => {
    if (!hostelId || !collectingFee) return
    if (!collectionDate) return toast.error('Collection date is required')
    if (collectionAmount <= 0) return toast.error('Amount must be greater than zero')
    if (collectionAmount > Number(collectingFee.due_amount)) return toast.error('Cannot pay more than the due amount')
    setSavingMsg(true)
    try {
      const res = await processPayment(
        collectingFee.id,
        hostelId,
        collectingFee.student_id,
        collectionAmount,
        Number(collectingFee.amount),
        Number(collectingFee.paid_amount || 0),
        'cash',
        collectionDate
      )
      toast.success(res.newStatus === 'paid' ? `Fully Paid! Receipt: ${res.receipt_id}` : 'Partial payment recorded!')
      setCollectingFee(null)
      queryClient.invalidateQueries({ queryKey: ['fees', hostelId] })
    } catch { toast.error('Failed to process payment.') }
    finally { setSavingMsg(false) }
  }

  const handleVerifyCode = async () => {
    if (!verifyingFee || !verificationCode) return toast.error('Please enter the 4-digit code')
    if (verificationCode.trim().length !== 4) return toast.error('Code must be exactly 4 digits')
    setVerifyingMsg(true)
    try {
      const res = await apiPayments.verifyOfflinePayment({
        fee_id: verifyingFee.id,
        code: verificationCode.trim()
      })
      if (res.success) {
        toast.success('Cash payment successfully verified!')
        setVerifyingFee(null)
        setVerificationCode('')
        queryClient.invalidateQueries({ queryKey: ['fees', hostelId] })
      } else {
        toast.error(res.error || 'Verification failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    } finally {
      setVerifyingMsg(false)
    }
  }

  const handleBulkGenerate = async () => {
    if (!hostelId) return
    setSavingMsg(true)
    try {
      const res = await generateBulkFees(hostelId, genMonthDate, genDueDate)
      if (res.created > 0) {
        toast.success(`Generated ${res.created} new fee records!`)
        queryClient.invalidateQueries({ queryKey: ['fees', hostelId] })
      } else {
        toast('All active students already have fees for this month.', { icon: '🙌' })
      }
      setShowGenerateModal(false)
    } catch (e: any) {
      toast.error('Failed to generate fees: ' + e.message)
    } finally {
      setSavingMsg(false)
    }
  }

  // FIXED: use feesData everywhere (was referencing undefined `fees`)
  const filtered = feesData
    .filter((f: any) => activeTab === 'All' || f.status.toLowerCase() === activeTab.toLowerCase())
    .filter((f: any) => !searchTerm || (f.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()))

  const totalCollected = feesData.filter((f: any) => f.status === 'paid').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const totalPending   = feesData.filter((f: any) => f.status === 'pending').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const totalOverdue   = feesData.filter((f: any) => f.status === 'overdue').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const totalExpected  = totalCollected + totalPending + totalOverdue
  const totalActualPaid = feesData.reduce((s: number, f: any) => s + Number(f.paid_amount || 0), 0)

  const loading = isLoading || isFetching

  const tabs = ['All', 'Paid', 'Pending', 'Overdue', 'Partial']

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* BULK GENERATE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" /> Auto-Generate Monthly Fees
              </h2>
              <button onClick={() => setShowGenerateModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Scan all active students and generate a pending fee record for the specified month.
                Students who already have a record for this month will be skipped.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Fee Month</label>
                  <input type="date" value={genMonthDate} onChange={e => setGenMonthDate(e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <input type="date" value={genDueDate} onChange={e => setGenDueDate(e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleBulkGenerate} disabled={savingMsg} className="btn-primary min-w-[140px]">
                {savingMsg ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Generate for All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT FEE MODAL */}
      {collectingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Collect Fee</h2>
              <button onClick={() => setCollectingFee(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm">
                <p className="text-blue-800"><span className="font-semibold">Student:</span> {collectingFee.student_name}</p>
                <p className="text-blue-800"><span className="font-semibold">Room:</span> {collectingFee.room_number ?? 'N/A'}</p>
                <div className="flex justify-between mt-2 pt-2 border-t border-blue-200 border-dashed">
                  <p className="text-blue-800 font-semibold">Total: {fmt(Number(collectingFee.amount))}</p>
                  <p className="text-rose-600 font-bold">Due: {fmt(Number(collectingFee.due_amount))}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Amount Paying Now *</label>
                <input type="number"
                  value={collectionAmount || ''}
                  onChange={e => setCollectionAmount(Number(e.target.value))}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  max={Number(collectingFee.due_amount)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Date of Collection *</label>
                <input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setCollectingFee(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleMarkPaid} disabled={savingMsg} className="btn-primary min-w-[120px] !bg-emerald-600 hover:!bg-emerald-700">
                {savingMsg ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fee Management</h1>
          <p className="text-slate-500 mt-1">Track payments, bulk bill students, and find defaulters.</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="btn-primary flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Bulk Generate Fees
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Expected', value: fmt(totalExpected),    color: '' },
          { label: 'Collected',      value: fmt(totalActualPaid),  color: 'text-emerald-600' },
          { label: 'Pending',        value: fmt(totalExpected - totalActualPaid), color: 'text-amber-600' },
          { label: 'Overdue',        value: fmt(totalOverdue),     color: 'text-rose-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs sm:text-sm font-medium text-slate-500">{s.label}</p>
            <h3 className={cn('text-lg sm:text-xl font-bold tracking-tight mt-1 truncate', s.color || 'text-slate-900')}>
              {s.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="card-premium">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 rounded-t-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Tab Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm overflow-x-auto">
              {tabs.map(tab => {
                const count = feesData.filter((f: any) => tab === 'All' || f.status.toLowerCase() === tab.toLowerCase()).length
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn('px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap',
                      activeTab === tab ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
                    {tab}
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px]', activeTab === tab ? 'bg-slate-700' : 'bg-slate-200')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        <AnimateView
          isLoading={loading}
          fallback={
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Student & Details</th>
                    <th className="px-6 py-4">Amount & Month</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-24 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="h-8 w-24 rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Student & Details</th>
                  <th className="px-6 py-4">Amount & Month</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No matching fee records found. Use "Bulk Generate Fees" to create them.
                    </td>
                  </tr>
                ) : (
                  filtered.map((fee: any) => {
                    const daysLate = fee.status === 'overdue' ? getDaysLate(fee.due_date) : 0
                    return (
                      <tr key={fee.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-[15px]">{fee.student_name ?? 'Unknown Student'}</span>
                            <span className="text-xs font-medium text-slate-500">Room: <span className="text-slate-700">{fee.room_number ?? 'N/A'}</span></span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{fmt(Number(fee.amount))}</span>
                            <span className="text-[11px] font-bold text-slate-400">Due: <span className="text-slate-600">{fmt(Number(fee.due_amount))}</span></span>
                            <span className="text-xs font-medium text-slate-500 mt-1">
                              {fee.month && new Date(fee.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
                              fee.status === 'paid'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              fee.status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              fee.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                         'bg-rose-50 text-rose-700 border-rose-200 animate-pulse')}>
                              {fee.status === 'paid'    && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {fee.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                              {fee.status === 'overdue' && <AlertCircle className="h-3.5 w-3.5" />}
                              {fee.status?.toUpperCase()}
                            </span>
                            {fee.offline_payment_status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                Pending Cash Code
                              </span>
                            )}
                          </div>
                          {daysLate > 0 && (
                            <p className="text-[11px] text-rose-600 font-bold mt-1">{daysLate} days late</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {fee.status !== 'paid' ? (
                            fee.offline_payment_status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setVerificationCode('')
                                    setVerifyingFee(fee)
                                  }}
                                  className="text-xs font-bold bg-amber-500 text-slate-950 px-3 py-2 rounded-lg hover:bg-amber-600 transition shadow-sm animate-bounce"
                                >
                                  Verify Cash Code
                                </button>
                                <button
                                  onClick={() => {
                                    setCollectionDate(new Date().toISOString().split('T')[0])
                                    setCollectionAmount(Number(fee.due_amount))
                                    setCollectingFee(fee)
                                  }}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2 py-1 rounded transition"
                                >
                                  Manual Collect
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setCollectionDate(new Date().toISOString().split('T')[0])
                                  setCollectionAmount(Number(fee.due_amount))
                                  setCollectingFee(fee)
                                }}
                                className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                              >
                                Collect Payment
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => toast.success(`Receipt ID: ${fee.receipt_id || 'N/A'}`)}
                              className="text-xs font-bold bg-white text-blue-700 px-4 py-2 rounded-lg border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition flex items-center gap-1.5 shadow-sm"
                            >
                              <FileDown className="h-4 w-4" /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </AnimateView>
      </div>

      {/* VERIFY CASH CODE MODAL */}
      {verifyingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Verify Cash Code</h2>
              <button onClick={() => setVerifyingFee(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-sm">
                <p className="text-amber-800"><span className="font-semibold">Student:</span> {verifyingFee.student_name}</p>
                <p className="text-amber-800"><span className="font-semibold">Month:</span> {verifyingFee.month && new Date(verifyingFee.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                <p className="text-amber-800"><span className="font-semibold">Amount:</span> {fmt(Number(verifyingFee.due_amount))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Enter 4-Digit Code *</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-center text-3xl font-mono font-black tracking-widest text-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Enter the 4-digit code provided by the student. Maximum 3 validation attempts are allowed before lock.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setVerifyingFee(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleVerifyCode} disabled={verifyingMsg} className="btn-primary min-w-[120px] !bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-bold">
                {verifyingMsg ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Verify Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
