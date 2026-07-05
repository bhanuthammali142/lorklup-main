// @ts-nocheck
/**
 * StudentFees — Fixed: removed supabase, uses apiFees REST API
 */
import React, { useEffect, useState } from 'react'
import { Wallet, Clock, CheckCircle2, AlertCircle, FileDown, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { apiFees, apiPayments } from '../../lib/api-client'
import { cn } from '../../lib/utils'
import { loadRazorpayScript, openRazorpayCheckout } from '../../lib/razorpay'
import toast from 'react-hot-toast'
import { FullScreenModal } from '../../components/FullScreenModal'

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

export function StudentFees() {
  const { studentData } = useAuth()
  const [fees, setFees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null) // stores fee.id being paid

  const [selectedFee, setSelectedFee] = useState<{ id: string; amount: number } | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [offlineCode, setOfflineCode] = useState<string | null>(null)
  const [requestingOffline, setRequestingOffline] = useState(false)

  useEffect(() => {
    if (!studentData?.id) return
    apiFees.getForStudent(studentData.id)
      .then((data: any[]) => setFees(data || []))
      .catch(err => toast.error('Failed to load fees'))
      .finally(() => setLoading(false))
  }, [studentData])

  const totalDue = fees.reduce((sum, f) => sum + Number(f.due_amount || 0), 0)
  const firstPendingFee = fees.find(f => f.status === 'pending' || f.status === 'overdue' || f.status === 'partial')

  const handlePayNow = async (feeId: string, amount: number) => {
    if (!studentData?.hostel_id) {
      toast.error('Hostel details not found.')
      return
    }

    setPaying(feeId)
    try {
      // 1. Create Order
      const res = await apiPayments.createOrder({
        fee_id: feeId,
        amount: Number(amount),
        hostel_id: studentData.hostel_id,
      })

      if (!res.success || !res.data) {
        throw new Error('Failed to create order')
      }

      // 2. Load script
      await loadRazorpayScript()

      // 3. Configure options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: res.data.total_amount * 100, // Amount in paise
        currency: 'INR',
        name: 'HostelOS Payments',
        description: 'Monthly Fee Payment',
        order_id: res.data.order_id,
        handler: async (response: any) => {
          setPaying(feeId)
          try {
            await apiPayments.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              fee_id: feeId,
            })
            toast.success('Payment successful! 🎉')
            // Reload fees
            const data = await apiFees.getForStudent(studentData.id)
            setFees(data || [])
          } catch (e: any) {
            toast.error(e.message || 'Payment verification failed')
          } finally {
            setPaying(null)
          }
        },
        prefill: {
          name: studentData.full_name || '',
          email: studentData.email || '',
          contact: studentData.phone || '',
        },
        theme: {
          color: '#2563eb',
        },
      }

      openRazorpayCheckout(options)
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed')
    } finally {
      setPaying(null)
    }
  }

  const handleRequestOffline = async (feeId: string) => {
    setRequestingOffline(true)
    try {
      const res = await apiPayments.requestOfflinePayment({ fee_id: feeId })
      if (res.success) {
        setOfflineCode(res.code)
        toast.success('Offline cash validation code generated!')
        if (studentData?.id) {
          const data = await apiFees.getForStudent(studentData.id)
          setFees(data || [])
        }
      } else {
        throw new Error('Failed to generate validation code')
      }
    } catch (err: any) {
      toast.error(err.message || 'Offline request failed')
    } finally {
      setRequestingOffline(false)
    }
  }

  if (!studentData) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Wallet className="h-8 w-8 text-emerald-500" /> My Fees
        </h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Track your due payments and view payment history.</p>
      </div>

      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Outstanding Due</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{loading ? '...' : fmt(totalDue)}</h2>
        </div>
        {totalDue > 0 && firstPendingFee && (
          <button
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => {
              if (firstPendingFee.offline_payment_status === 'pending') {
                setOfflineCode(firstPendingFee.offline_code)
                setSelectedFee({ id: firstPendingFee.id, amount: firstPendingFee.due_amount })
                setShowOptionsModal(true)
              } else {
                setSelectedFee({ id: firstPendingFee.id, amount: firstPendingFee.due_amount })
                setOfflineCode(null)
                setShowOptionsModal(true)
              }
            }}
            disabled={paying !== null}
          >
            {paying === firstPendingFee.id ? (
              <Loader2 className="animate-spin h-5 w-5 text-slate-900" />
            ) : null}
            {firstPendingFee.offline_payment_status === 'pending' ? 'View Cash Code' : 'Pay Outstanding'}
          </button>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-4">Fee History</h3>
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
            <Loader2 className="animate-spin h-5 w-5" /> Loading...
          </div>
        ) : fees.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No fee records found yet.
          </div>
        ) : (
          <div className="space-y-3">
            {fees.map(fee => (
              <div
                key={fee.id}
                className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex gap-4 items-center">
                  <div className={cn(
                    'hidden sm:flex h-12 w-12 rounded-xl items-center justify-center border',
                    fee.status === 'paid'    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    fee.status === 'partial' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                    fee.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                              'bg-rose-50 border-rose-100 text-rose-600'
                  )}>
                    {fee.status === 'paid'    && <CheckCircle2 className="h-6 w-6" />}
                    {(fee.status === 'pending' || fee.status === 'partial') && <Clock className="h-6 w-6" />}
                    {fee.status === 'overdue' && <AlertCircle className="h-6 w-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg leading-tight">
                      {new Date(fee.month).toLocaleString('default', { month: 'long', year: 'numeric' })} Bill
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-slate-500 mt-1">
                      <span>Total: <strong className="text-slate-700">{fmt(Number(fee.amount))}</strong></span>
                      <span className="hidden sm:inline">•</span>
                      <span>Due: <strong className="text-rose-600">{fmt(Number(fee.due_amount))}</strong></span>
                      {fee.due_date && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>Due Date: {new Date(fee.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border',
                    fee.status === 'paid'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    fee.status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    fee.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                              'bg-rose-50 text-rose-700 border-rose-200'
                  )}>
                    {fee.status}
                  </span>
                  {fee.status !== 'paid' && (
                    fee.offline_payment_status === 'pending' ? (
                      <button
                        onClick={() => {
                          setOfflineCode(fee.offline_code)
                          setSelectedFee({ id: fee.id, amount: fee.due_amount })
                          setShowOptionsModal(true)
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                      >
                        View Cash Code
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedFee({ id: fee.id, amount: fee.due_amount })
                          setOfflineCode(null)
                          setShowOptionsModal(true)
                        }}
                        disabled={paying !== null}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {paying === fee.id ? <Loader2 className="animate-spin h-3 w-3" /> : null}
                        {paying === fee.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    )
                  )}
                  {fee.status === 'paid' && fee.receipt_id && (
                    <button
                      onClick={() => toast.success(`Receipt ID: ${fee.receipt_id}`)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      title="View Receipt"
                    >
                      <FileDown className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FullScreenModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false)
          setSelectedFee(null)
          setOfflineCode(null)
        }}
        title={offlineCode ? "Offline Payment Instruction" : "Select Payment Method"}
      >
        {selectedFee && (
          <div className="space-y-6 text-slate-300">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-750/50 text-center">
              <span className="text-slate-400 text-xs uppercase font-black tracking-wider">Amount to Pay</span>
              <h4 className="text-3xl font-black text-white mt-1">{fmt(selectedFee.amount)}</h4>
            </div>

            {offlineCode ? (
              <div className="space-y-4 text-center">
                <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                  <span className="text-amber-400 text-xs font-black tracking-wider uppercase block mb-1">Cash Payment Code</span>
                  <div className="text-5xl font-black tracking-widest text-amber-400 font-mono my-3 select-all">
                    {offlineCode}
                  </div>
                  <p className="text-xs text-amber-300/80 leading-relaxed mt-2">
                    Show this 4-digit code to the hostel owner when you pay them cash.
                    The owner will verify it in their portal to confirm and clear this bill.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOptionsModal(false)
                    setSelectedFee(null)
                    setOfflineCode(null)
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => {
                    setShowOptionsModal(false)
                    handlePayNow(selectedFee.id, selectedFee.amount)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-5 rounded-2xl transition flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-blue-500/10 border border-blue-500/20"
                >
                  <span className="text-base font-black">Pay Online (Razorpay)</span>
                  <span className="text-xs text-blue-200/70 font-normal">Convenient, instant e-receipt generation</span>
                </button>

                <button
                  onClick={() => handleRequestOffline(selectedFee.id)}
                  disabled={requestingOffline}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-5 rounded-2xl transition flex flex-col items-center justify-center gap-1 border border-slate-700/80 disabled:opacity-50"
                >
                  {requestingOffline ? (
                    <Loader2 className="animate-spin h-5 w-5 text-white animate-spin" />
                  ) : (
                    <>
                      <span className="text-base font-black">Pay Offline (Cash to Owner)</span>
                      <span className="text-xs text-slate-400 font-normal">Get a 4-digit code for cash hand-over</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </FullScreenModal>
    </div>
  )
}
