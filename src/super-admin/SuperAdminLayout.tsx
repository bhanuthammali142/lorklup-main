import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Ticket,
  LogOut,
  ShieldCheck,
  Settings,
  Menu,
  X,
  Users,
  IndianRupee,
  MessageSquareWarning,
  ClipboardList
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { cn } from '../lib/utils'

const NAV = [
  { name: 'Platform Overview', href: '/superadmin/dashboard',    icon: LayoutDashboard,       end: true  },
  { name: 'Hostel Profiles',   href: '/superadmin/hostels',       icon: Building2,             end: false },
  { name: 'User Management',   href: '/superadmin/users',         icon: Users,                 end: false },
  { name: 'Finance Panel',     href: '/superadmin/finance',       icon: IndianRupee,           end: false },
  { name: 'Complaints',        href: '/superadmin/complaints',    icon: MessageSquareWarning,  end: false },
  { name: 'Audit Logs',        href: '/superadmin/audit-logs',    icon: ClipboardList,         end: false },
  { name: 'Support Tickets',   href: '/superadmin/tickets',       icon: Ticket,                end: false },
  { name: 'System Settings',   href: '/superadmin/settings',      icon: Settings,              end: false },
]

export function SuperAdminLayout() {
  const { signOut, user } = useAuth()
  const initial = user?.email?.charAt(0).toUpperCase() || 'S'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const BOTTOM_NAV = [
    { name: 'Overview', href: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'Hostels',  href: '/superadmin/hostels',   icon: Building2 },
    { name: 'Users',    href: '/superadmin/users',     icon: Users },
    { name: 'Finance',  href: '/superadmin/finance',   icon: IndianRupee },
  ]

  const SidebarContent = ({ isMobile, onClose }: { isMobile?: boolean, onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 relative shadow-2xl">
      {/* Glow effect */}
      <div className="absolute top-0 -left-4 w-72 h-32 bg-indigo-500/20 blur-[60px] pointer-events-none" />

      {/* Logo */}
      <div className="px-5 py-4 h-14 md:h-16 border-b border-slate-800/60 relative z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">HostelOS <span className="text-indigo-400">HQ</span></span>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
            <X className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
      
      <div className="px-5 py-4 border-b border-slate-800/60 relative z-10">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center font-black text-white shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Super Admin</p>
            <p className="text-[10px] text-emerald-400 truncate font-semibold uppercase tracking-widest">Platform Owner</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto w-full relative z-10">
        {NAV.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px]',
              isActive
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-800/60 relative z-10">
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all min-h-[44px]"
        >
          <LogOut className="h-4 w-4" />
          Terminate Session
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#fcfcfd] dark:bg-[#0b0f19] relative overflow-hidden text-[#111827] dark:text-slate-100">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 z-20 shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden w-64 bg-slate-950 ${mobileMenuOpen ? 'translate-x-0 cursor-default shadow-2xl' : '-translate-x-full'}`}>
        <SidebarContent isMobile onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-14 md:h-16 items-center justify-between px-4 sm:px-6 md:px-8 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:block">
              {NAV.find(n => n.href === location.pathname)?.name || 'HQ Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-full px-2.5 py-1">
              <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">HQ Access</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] px-4 sm:px-6 md:px-8 py-6 sm:py-8 pb-20 md:pb-8 mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 z-30 flex items-stretch"
          style={{ paddingBottom: 'var(--safe-area-bottom)', minHeight: 'calc(56px + var(--safe-area-bottom))' }}
          aria-label="Mobile primary navigation"
        >
          {BOTTOM_NAV.map(item => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/superadmin/dashboard'}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-all duration-150 active:scale-95',
                isActive ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5.5 w-5.5 transition-transform duration-200', isActive && 'scale-110 text-indigo-500')} />
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
