import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link, NavLink, useNavigate } from 'react-router-dom'
import { AdminSidebar } from './components/AdminSidebar'
import { Menu, AlertCircle, ShieldAlert, LayoutDashboard, Users, Bed, Wallet } from 'lucide-react'
import { NotificationBell } from '../components/NotificationBell'
import { useQuery } from '@tanstack/react-query'
import { apiBilling } from '../lib/api-client'
import { cn } from '../lib/utils'

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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

  useEffect(() => {
    if (isPastGracePeriod && location.pathname !== '/admin/billing') {
      navigate('/admin/billing', { replace: true })
    }
  }, [isPastGracePeriod, location.pathname, navigate])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const BOTTOM_NAV = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Rooms', href: '/admin/rooms', icon: Bed },
    { name: 'Fees', href: '/admin/fees', icon: Wallet },
  ]

  return (
    <div className="flex h-screen bg-[#fcfcfd] dark:bg-[#0b0f19] relative overflow-hidden text-[#111827] dark:text-slate-100">
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
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden w-64 bg-white dark:bg-[#151c2e] border-r border-slate-200 dark:border-slate-800 ${mobileMenuOpen ? 'translate-x-0 cursor-default shadow-2xl' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Mobile navigation menu"
        aria-hidden={!mobileMenuOpen}
      >
        <AdminSidebar isMobile onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Top Navbar */}
        <header className="md:hidden flex h-14 items-center justify-between px-4 sm:px-6 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/90 dark:bg-[#151c2e]/90 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">HostelOS</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
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
          <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#151c2e]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 z-30 flex items-stretch"
          style={{ paddingBottom: 'var(--safe-area-bottom)', minHeight: 'calc(56px + var(--safe-area-bottom))' }}
          aria-label="Mobile primary navigation"
        >
          {BOTTOM_NAV.map(item => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin/dashboard'}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-all duration-150 active:scale-95',
                isActive ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5.5 w-5.5 transition-transform duration-200', isActive && 'scale-110 text-blue-500')} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 active:scale-95"
            aria-label="Open side navigation drawer"
          >
            <Menu className="h-5.5 w-5.5" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
