import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { AdminSidebar } from './components/AdminSidebar'
import { Menu, AlertCircle, ShieldAlert } from 'lucide-react'
import { NotificationBell } from '../components/NotificationBell'
import { useQuery } from '@tanstack/react-query'
import { apiBilling } from '../lib/api-client'

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const { data: billingData } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const res = await apiBilling.getMySubscription()
      return res.data
    },
    staleTime: 1000 * 60 * 5, // 5 mins cache
    retry: false
  })

  const sub = billingData?.subscription
  const daysRemaining = sub?.daysRemaining ?? 0
  const isExpired = sub?.isExpired ?? false
  const isPastGracePeriod = sub?.isPastGracePeriod ?? false

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-[#fcfcfd] relative overflow-hidden text-[#111827]">
      {/* Ambient background */}
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-400/5 blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <div className="hidden md:block z-20">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden w-64 bg-white ${mobileMenuOpen ? 'translate-x-0 cursor-default' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Mobile navigation menu"
        aria-hidden={!mobileMenuOpen}
      >
        <AdminSidebar isMobile onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Top Navbar */}
        <header className="md:hidden flex h-14 items-center justify-between px-4 sm:px-6 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="text-lg font-black tracking-tight text-slate-900">HostelOS</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Subscription top warnings banner */}
        {isPastGracePeriod && (
          <div className="bg-red-600 text-white text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between shadow-md font-bold shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Subscription expired past grace period. Dashboard writing capabilities are locked.</span>
            </div>
            <Link to="/admin/billing" className="underline hover:text-red-100 flex items-center gap-1 font-extrabold ml-4">
              Renew Now &rarr;
            </Link>
          </div>
        )}

        {!isPastGracePeriod && isExpired && (
          <div className="bg-orange-500 text-white text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between shadow-md font-bold shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Subscription expired. Please renew immediately to avoid service write-block.</span>
            </div>
            <Link to="/admin/billing" className="underline hover:text-orange-100 flex items-center gap-1 font-extrabold ml-4">
              Renew Now &rarr;
            </Link>
          </div>
        )}

        {!isExpired && daysRemaining > 0 && daysRemaining <= 7 && (
          <div className="bg-amber-500 text-white text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between shadow-md font-bold shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Subscription ending in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.</span>
            </div>
            <Link to="/admin/billing" className="underline hover:text-amber-100 flex items-center gap-1 font-extrabold ml-4">
              Renew Subscription &rarr;
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
