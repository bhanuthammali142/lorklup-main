import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, AlertCircle, Calendar, Download, RefreshCw, HelpCircle, ShieldAlert } from 'lucide-react';
import { apiBilling, getToken } from '../../lib/api-client';
import { Skeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export function Billing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const res = await apiBilling.getMySubscription();
      return res.data;
    }
  });

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const res = await apiBilling.subscribe(sub?.id || 'plan_professional');
      
      const options = {
        key: res.data.key_id,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'HostelOS Platform',
        description: `HostelOS Professional - Monthly Subscription`,
        order_id: res.data.order_id,
        handler: async function (response: any) {
          try {
            await apiBilling.verify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success('Subscription activated successfully!');
            refetch();
          } catch (error: any) {
            toast.error(error.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: 'Hostel Owner'
        },
        theme: {
          color: '#4f46e5'
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-4xl">
        <h2 className="text-xl font-bold">Failed to load subscription details</h2>
        <p className="mt-2 text-sm text-red-600">Could not retrieve subscription information from the server. Please check your connection and try again.</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl transition text-sm"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const { subscription: sub, payments, invoices } = data;
  const daysRemaining = sub.daysRemaining ?? 0;
  const isExpired = sub.isExpired ?? false;
  const isPastGracePeriod = sub.isPastGracePeriod ?? false;

  // Banner warnings logic
  let bannerElement = null;
  if (isPastGracePeriod) {
    bannerElement = (
      <div className="bg-red-50 border-2 border-red-200 text-red-700 p-5 rounded-2xl flex items-start gap-4 shadow-sm animate-bounce-subtle">
        <ShieldAlert className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-extrabold text-lg">Subscription Expired & Write-Blocked!</h3>
          <p className="text-sm mt-1 text-red-600">
            Your HostelOS subscription has expired past the grace period. All dashboard mutating features (adding/editing students, rooms, attendance, fees, etc.) are currently **blocked**. Please subscribe below to restore full dashboard access.
          </p>
        </div>
      </div>
    );
  } else if (isExpired) {
    bannerElement = (
      <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Subscription Expired (Grace Period Active)</h3>
          <p className="text-sm mt-1 text-orange-600 font-medium">
            Your subscription has expired, but you are currently in a grace period. Please renew immediately. After the grace period, dashboard writing access will be restricted.
          </p>
        </div>
      </div>
    );
  } else if (daysRemaining > 0 && daysRemaining <= 3) {
    bannerElement = (
      <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-pulse">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Urgent: Only {daysRemaining} Days Remaining!</h3>
          <p className="text-sm mt-1 text-orange-600 font-medium font-semibold">
            Your HostelOS plan ends in {daysRemaining} days. Renew now to prevent automatic writing restrictions.
          </p>
        </div>
      </div>
    );
  } else if (daysRemaining > 0 && daysRemaining <= 7) {
    bannerElement = (
      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Subscription Ending Soon</h3>
          <p className="text-sm mt-1 text-amber-600 font-medium">
            Your subscription ends in {daysRemaining} days. Please consider renewing early to avoid any platform usage interruption.
          </p>
        </div>
      </div>
    );
  }

  // Helper to trigger invoice download
  const getInvoiceDownloadUrl = (invoiceId: string) => {
    const envApiUrl = import.meta.env.VITE_API_URL || 'https://hostelos-yis2.onrender.com/api';
    const baseUrl = envApiUrl.replace(/\/api$/, '');
    return `${baseUrl}/api/billing/invoices/${invoiceId}/download?token=${getToken()}`;
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Subscription & Billing</h1>
          <p className="text-slate-500 mt-1">Manage your platform plan, view billing records, and print GST tax invoices.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
          title="Refresh Billing Status"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {bannerElement}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Plan Information Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6">
            {sub.status === 'active' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </span>
            )}
            {sub.status === 'trialing' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Free Trial
              </span>
            )}
            {(sub.status === 'expired' || sub.status === 'suspended') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <ShieldAlert className="h-3.5 w-3.5" /> Suspended
              </span>
            )}
            {sub.status === 'canceled' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                Canceled
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Plan</h2>
            <h3 className="text-2xl font-black text-slate-800 mb-6">{sub.plan_name}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 block mb-1">Base Price</span>
                <span className="text-xl font-extrabold text-slate-800">₹{Number(sub.plan_price).toFixed(2)}</span>
                <span className="text-xs text-slate-500 font-medium">/mo</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 block mb-1">GST Collected (18%)</span>
                <span className="text-xl font-extrabold text-slate-800">₹{Number(sub.gst_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" /> Subscription Expiry
                </span>
                <span className="text-slate-800 font-bold">
                  {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-500 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-slate-400" /> Usage Limit
                </span>
                <span className="text-slate-800 font-bold">Unlimited Students & Rooms</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" /> Days Remaining
                </span>
                <span className={`font-bold ${daysRemaining <= 3 ? 'text-red-600' : 'text-slate-800'}`}>
                  {daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-100 transition disabled:opacity-50"
            >
              <CreditCard className="h-5 w-5" />
              {isProcessing ? 'Connecting Gateway...' : isExpired || isPastGracePeriod ? 'Renew Subscription Now' : 'Extend Subscription'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2 font-medium">
              Secured payments powered by Razorpay. Price: ₹999 + 18% GST = ₹1,178.82 / month
            </p>
          </div>
        </div>

        {/* Info & Support Panel */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-xl">
          <div>
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">HostelOS Professional</h4>
            <h3 className="text-xl font-bold mb-6 text-slate-100">Premium business features included</h3>
            
            <ul className="space-y-4 text-sm font-medium text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>GST Tax Invoices ready for business accounting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Unlimited Student Records & Attendance Tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Online Fee Collection through UPI, Credit Cards, and Net Banking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Complete financial reporting tools</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-800 pt-6 mt-6">
            <span className="text-xs text-slate-400 block mb-1">Need help with billing?</span>
            <a 
              href="mailto:support@hostelos.in" 
              className="text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors"
            >
              Contact support@hostelos.in
            </a>
          </div>
        </div>
      </div>

      {/* Invoice History Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Invoice & Payment History</h3>
        {(!invoices || invoices.length === 0) ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-400 text-sm font-medium">No billing transactions or invoices found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Invoice Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Base Amount</th>
                  <th className="pb-3 text-right">GST (18%)</th>
                  <th className="pb-3 text-right">Total Amount</th>
                  <th className="pb-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  // Find matching payment to show price details
                  const payment = payments?.find((p: any) => p.invoice_number === inv.invoice_number);
                  const baseAmount = payment ? Number(payment.amount).toFixed(2) : '999.00';
                  const gstAmount = payment ? Number(payment.gst_amount).toFixed(2) : '179.82';
                  const totalAmount = payment ? Number(payment.total_amount).toFixed(2) : '1178.82';
                  const paymentDate = payment?.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : new Date(inv.created_at).toLocaleDateString('en-IN');

                  return (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="py-4 pl-2 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-4 text-slate-500 font-medium">{paymentDate}</td>
                      <td className="py-4 text-right text-slate-500 font-bold">₹{baseAmount}</td>
                      <td className="py-4 text-right text-slate-500 font-medium">₹{gstAmount}</td>
                      <td className="py-4 text-right text-slate-900 font-extrabold">₹{totalAmount}</td>
                      <td className="py-4 text-center">
                        <a
                          href={getInvoiceDownloadUrl(inv.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Download Tax Invoice
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
