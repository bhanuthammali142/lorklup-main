import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle2, AlertTriangle, Building2, TrendingUp, ShieldAlert, Settings, Save, Search, RefreshCw, DollarSign } from 'lucide-react'
import { apiSuperAdmin } from '../../lib/api-client'
import { Skeleton } from '../../components/Skeleton'
import toast from 'react-hot-toast'

export function SuperAdminSubscriptions() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    monthly_price: '999',
    gst_percentage: '18',
    trial_period_days: '7',
    grace_period_days: '5'
  })

  // Queries
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['super-admin-billing-stats'],
    queryFn: async () => {
      const res = await apiSuperAdmin.getBillingStats()
      return res.data
    }
  })

  const { data: subscriptions = [], isLoading: isSubsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ['super-admin-subscriptions', statusFilter, searchTerm],
    queryFn: async () => {
      const res = await apiSuperAdmin.getBillingSubscriptions({
        status: statusFilter,
        search: searchTerm
      })
      return res.data
    }
  })

  const { isLoading: isSettingsLoading } = useQuery({
    queryKey: ['super-admin-billing-settings'],
    queryFn: async () => {
      const res = await apiSuperAdmin.getBillingSettings()
      if (res.data) {
        setSettingsForm({
          monthly_price: res.data.monthly_price || '999',
          gst_percentage: res.data.gst_percentage || '18',
          trial_period_days: res.data.trial_period_days || '7',
          grace_period_days: res.data.grace_period_days || '5'
        })
      }
      return res.data
    }
  })

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Record<string, string>) => apiSuperAdmin.updateBillingSettings(newSettings),
    onSuccess: () => {
      toast.success('Billing settings saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['super-admin-billing-settings'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiSuperAdmin.toggleSubscriptionStatus(id, status),
    onSuccess: () => {
      toast.success('Subscription status updated!')
      queryClient.invalidateQueries({ queryKey: ['super-admin-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-billing-stats'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update subscription')
    }
  })

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettingsMutation.mutate(settingsForm)
  }

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    if (confirm(`Are you sure you want to change the subscription status to ${nextStatus}?`)) {
      toggleStatusMutation.mutate({ id, status: nextStatus })
    }
  }

  const handleRefresh = () => {
    refetchStats()
    refetchSubs()
  }

  if (isStatsLoading || isSubsLoading || isSettingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const stats = statsData?.stats || {
    active_subscriptions: 0,
    trialing_subscriptions: 0,
    expired_subscriptions: 0,
    total_gst_collected: 0,
    total_revenue: 0,
    mrr: 0
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-indigo-600" /> Platform Subscriptions & Billing
          </h1>
          <p className="text-slate-500 mt-1">Configure pricing plans, view platform metrics, and manually toggle subscriptions.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
          title="Refresh Data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Recurring Revenue', value: `₹${Number(stats.mrr).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'bg-indigo-600 text-white shadow-indigo-100' },
          { label: 'Total Revenue (Paid)', value: `₹${Number(stats.total_revenue).toLocaleString('en-IN')}`, icon: DollarSign, color: 'bg-emerald-600 text-white shadow-emerald-100' },
          { label: 'Active Subscribers', value: stats.active_subscriptions + stats.trialing_subscriptions, icon: CheckCircle2, color: 'bg-white border border-slate-200 text-slate-900 shadow-sm' },
          { label: 'Expired / Blocked', value: stats.expired_subscriptions, icon: ShieldAlert, color: 'bg-white border border-slate-200 text-slate-900 shadow-sm' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className={`rounded-3xl p-6 shadow-lg ${s.color} relative overflow-hidden`}>
              <div className="absolute right-0 bottom-0 p-3 opacity-10">
                <Icon className="h-20 w-20" />
              </div>
              <Icon className="h-6 w-6 mb-3 opacity-90" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">{s.label}</p>
              <p className="text-2xl font-black mt-1 tracking-tight">{s.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscriptions Table List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" /> Hostels Subscriptions List
              </h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search hostel or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">No subscription matches found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 pl-2">Hostel & Owner</th>
                      <th className="px-4 py-3">Plan Details</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((sub: any) => {
                      const isSubActive = sub.status === 'active' || sub.status === 'trialing';
                      
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-4 pl-2">
                            <div className="font-bold text-slate-900">{sub.hostel_name}</div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">
                              {sub.owner_name} &bull; {sub.owner_phone}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800">₹{Number(sub.total_amount).toFixed(2)}</span>
                            <span className="text-xs text-slate-400 font-medium block">/{sub.plan_name}</span>
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-500">
                            {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {sub.status === 'active' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            )}
                            {sub.status === 'trialing' && (
                              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                                Trial
                              </span>
                            )}
                            {sub.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                <ShieldAlert className="h-3 w-3" /> Blocked
                              </span>
                            )}
                            {sub.status === 'expired' && (
                              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                                <AlertTriangle className="h-3 w-3" /> Expired
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => handleToggleStatus(sub.id, sub.status)}
                              className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition ${
                                isSubActive
                                  ? 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white'
                                  : 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              {isSubActive ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Settings Configurations Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2 mb-6">
              <Settings className="h-5 w-5 text-slate-500" /> Platform Billing Configurations
            </h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Base Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={settingsForm.monthly_price}
                  onChange={(e) => setSettingsForm({ ...settingsForm, monthly_price: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Percentage (%)</label>
                <input
                  type="number"
                  required
                  value={settingsForm.gst_percentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gst_percentage: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trial Period Days</label>
                <input
                  type="number"
                  required
                  value={settingsForm.trial_period_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, trial_period_days: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grace Period Days</label>
                <input
                  type="number"
                  required
                  value={settingsForm.grace_period_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, grace_period_days: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg transition"
              >
                <Save className="h-5 w-5" />
                {updateSettingsMutation.isPending ? 'Saving Configurations...' : 'Save Configurations'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
