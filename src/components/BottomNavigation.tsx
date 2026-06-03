// src/components/BottomNavigation.tsx
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

export interface BottomTab {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badgeCount?: number
}

interface BottomNavigationProps {
  tabs: BottomTab[]
  activeColor?: string
  inactiveColor?: string
  className?: string
}

export function BottomNavigation({
  tabs,
  activeColor = 'text-blue-500',
  inactiveColor = 'text-slate-400 hover:text-slate-300',
  className
}: BottomNavigationProps) {
  const location = useLocation()

  return (
    <nav 
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 z-30 flex items-stretch",
        className
      )}
      style={{ paddingBottom: 'var(--safe-area-bottom)', minHeight: 'calc(56px + var(--safe-area-bottom))' }}
      aria-label="Mobile Navigation"
    >
      {tabs.map(item => {
        const Icon = item.icon
        const isActive = location.pathname === item.href || (item.href !== '/student/dashboard' && location.pathname.startsWith(item.href))
        
        return (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/student/dashboard' || item.href === '/admin/dashboard'}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-all duration-150 active:scale-95 relative"
          >
            <div className="relative">
              <Icon 
                className={cn(
                  'h-5.5 w-5.5 transition-transform duration-200', 
                  isActive ? cn('scale-110', activeColor) : inactiveColor
                )} 
              />
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-slate-950 animate-pulse">
                  {item.badgeCount > 9 ? '9+' : item.badgeCount}
                </span>
              )}
            </div>
            <span className={cn('transition-colors duration-150', isActive ? activeColor : 'text-slate-400')}>{item.name}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
export default BottomNavigation
