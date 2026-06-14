// @ts-nocheck
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, Search, Download, RefreshCw, Loader2,
  TrendingUp, TrendingDown, IndianRupee, CreditCard,
  AlertCircle, CheckCircle2, Clock, Filter, Building
} from 'lucide-react'
import { apiSuperAdmin } from '../../lib/api-client'
import toast from 'react-hot-toast'

const STATUS_STYLE: Record<string, string> = {
  paid:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  overdue:  'bg-rose-50 text-rose-700 border-rose-200',
  partial:  'bg-blue-50 text-blue-700 border-blue-200',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls} capitalize`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

export function SuperAdminFinance() {
  const [tab, setTab] = useState<'payments' | 'fees' | 'hostels'>('payments')
  const [search, setSearch] = useState('')
  const [hostelFilter, setHostelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Revenue summary
  const { data: revData, refetch: refetchRev } = useQuery({
    queryKey: ['sa-revenue'],
    queryFn: async () => {
      const res = await apiSuperAdmin.getRevenueSummary()
      return res.data
    },
    staleTime: 60_000,
  })

  const payParams: any = {}
  if (search) payParams.search = search
  if (hostelFilter) payParams.hostel_id = hostelFilter
  if (fromDate) payParams.from_date = fromDate
  if (toDate) payParams.to_date = toDate

  const feeParams: any = {}
  if (hostelFilter) feeParams.hostel_id = hostelFilter
  if (statusFilter) feeParams.status = statusFilter

  const { data: payments = [], isLoading: loadingPay, refetch: refetchPay } = useQuery({
    queryKey: ['sa-payments', payParams],
    queryFn: async () => {
      const res = await apiSuperAdmin.getPayments(payParams)
      return res.data || []
    },
    enabled: tab === 'payments',
    staleTime: 30_000,
  })

  const { data: fees = [], isLoading: loadingFees, refetch: refetchFees } = useQuery({
    queryKey: ['sa-fees', feeParams],
    queryFn: async () => {
      const res = await apiSuperAdmin.getFees(feeParams)
      return res.data || []
    },
    enabled: tab === 'fees',
    staleTime: 30_000,
  })

  // CSV export
  function exportCSV(data: any[], filename: string) {
    if (!data.length) return
    const cols = Object.keys(data[0])
    const csv = [
      cols.join(','),
      ...data.map(row => cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const totals = revData?.totals || {}
  const byHostel = revData?.byHostel || []
  const byMonth  = revData?.byMonth  || []

  const filteredHostels = byHostel.filter((h: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      h.hostel_name?.toLowerCase().includes(s) ||
      h.city?.toLowerCase().includes(s) ||
      h.owner_name?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Finance Panel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue, payments and fee tracking across all hostels</p>
        </div>
        <button
          onClick={() => {
            if (tab === 'payments') refetchPay()
            else if (tab === 'fees') refetchFees()
            else refetchRev()
          }}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-slate-400" /> Refresh
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue" icon={IndianRupee}
          value={fmt(totals.total_revenue)} sub="All time collected"
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="This Month" icon={TrendingUp}
          value={fmt(totals.this_month)} sub="Current month"
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Last Month" icon={TrendingDown}
          value={fmt(totals.last_month)} sub="Previous month"
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Pending Fees" icon={AlertCircle}
          value={fees.filter((f: any) => ['pending','overdue','partial'].includes(f.status)).length}
          sub="Awaiting collection"
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Monthly Revenue Bar Chart */}
      {byMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4 text-sm">Monthly Revenue (Last 12 months)</h2>
          <div className="flex items-end gap-2 h-32">
            {byMonth.map((m: any) => {
              const max = Math.max(...byMonth.map((x: any) => Number(x.revenue || 0))) || 1
              const pct = (Number(m.revenue || 0) / max) * 100
              return (
                <div key={m.sort_key} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full bg-indigo-500 rounded-t-md transition-all hover:bg-indigo-600"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{m.label.split(' ')[0]}</span>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                    {fmt(m.revenue)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Revenue by Hostel */}
      {byHostel.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Revenue by Hostel</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {byHostel.slice(0, 6).map((h: any) => (
              <div key={h.hostel_name} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{h.hostel_name}</p>
                  <p className="text-xs text-slate-400">{h.city} · {h.payment_count} payments</p>
                </div>
                <p className="font-black text-emerald-600 text-sm">{fmt(h.total_collected)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['payments', 'fees', 'hostels'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'payments' ? '💳 Payments' : t === 'fees' ? '📄 Fees' : '🏢 Hostel Payouts'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3">
        {tab === 'hostels' && (
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search hostel or owner…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
            />
          </div>
        )}
        {tab === 'fees' && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
          </select>
        )}
        {tab === 'payments' && (
          <>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </>
        )}
        <button
          onClick={() => {
            const dataToExport = tab === 'payments' ? payments : tab === 'fees' ? fees : filteredHostels
            exportCSV(dataToExport, `${tab}-export.csv`)
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition ml-auto"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Payments Table */}
      {tab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <span className="font-bold text-slate-800 text-sm">
              {loadingPay ? 'Loading…' : `${payments.length} Payments`}
            </span>
          </div>
          {loadingPay ? (
            <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
              <Loader2 className="animate-spin h-5 w-5" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Student', 'Hostel', 'Amount', 'Method', 'Month', 'Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{p.student_name}</p>
                        <p className="text-xs text-slate-400">{p.student_email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{p.hostel_name}</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600">{fmt(p.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-500 capitalize text-xs">{p.payment_method}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {p.month ? new Date(p.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fees Table */}
      {tab === 'fees' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <span className="font-bold text-slate-800 text-sm">
              {loadingFees ? 'Loading…' : `${fees.length} Fee Records`}
            </span>
          </div>
          {loadingFees ? (
            <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
              <Loader2 className="animate-spin h-5 w-5" />
            </div>
          ) : fees.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No fee records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Student', 'Hostel', 'Amount', 'Paid', 'Due', 'Month', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fees.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{f.student_name}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{f.hostel_name}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{fmt(f.amount)}</td>
                      <td className="px-5 py-3.5 text-emerald-600 font-semibold">{fmt(f.paid_amount)}</td>
                      <td className="px-5 py-3.5 text-rose-600 font-semibold">{fmt(f.due_amount)}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {f.month ? new Date(f.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={f.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hostels Payouts Table */}
      {tab === 'hostels' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hostel Collections & Settlements</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track online student fees collected via central gateway and due payouts to owners.</p>
            </div>
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold">
              {filteredHostels.length} Hostels
            </span>
          </div>

          {filteredHostels.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hostels found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Hostel & Owner</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Cash Collected (Direct)</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Online Collected (Central)</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Net Payout to Send</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Settlement Bank Account</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHostels.map((h: any) => {
                    const hasBank = h.bank_name && h.account_number && h.ifsc_code
                    const payoutAmount = Number(h.online_collected || 0)

                    return (
                      <tr key={h.hostel_id || h.hostel_name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 text-sm">{h.hostel_name}</p>
                          <p className="text-xs text-slate-400">{h.city}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-medium">{h.owner_name}</span>
                            <span>·</span>
                            <span>{h.owner_phone || 'No Phone'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {fmt(h.cash_collected)}
                          <p className="text-[10px] text-slate-400 mt-0.5">Kept directly by hostel</p>
                        </td>
                        <td className="px-5 py-4 text-indigo-600 font-bold">
                          {fmt(h.online_collected)}
                          <p className="text-[10px] text-indigo-400 mt-0.5">Collected via Central RZP</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex flex-col">
                            <span className="text-emerald-600 font-black text-sm">{fmt(payoutAmount)}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Awaiting Transfer</span>
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {hasBank ? (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 max-w-[220px]">
                              <p className="text-xs font-bold text-slate-800 truncate">{h.bank_name}</p>
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5 select-all" title="Click to copy account number">
                                A/C: {h.account_number}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">
                                IFSC: {h.ifsc_code}
                              </p>
                              <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                                Holder: {h.account_holder}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> No Bank Details Saved
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {payoutAmount > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (hasBank) {
                                    navigator.clipboard.writeText(
                                      `Bank: ${h.bank_name}\nHolder: ${h.account_holder}\nA/C: ${h.account_number}\nIFSC: ${h.ifsc_code}\nAmount: ₹${payoutAmount}`
                                    )
                                    toast.success('Bank coordinates & payout amount copied to clipboard!')
                                  } else {
                                    toast.error('Hostel Owner has not provided bank details yet.')
                                  }
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition"
                              >
                                Copy Bank Info
                              </button>
                              <button
                                onClick={() => {
                                  toast.success(`Simulated payout of ${fmt(payoutAmount)} to ${h.hostel_name} marked settled successfully!`)
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-sm"
                              >
                                Settle Payout
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Nothing to settle</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
