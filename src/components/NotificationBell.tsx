import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../lib/useNotifications'
import { NotificationCenter } from './NotificationCenter'
import { triggerHaptic } from '../lib/capacitor'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount } = useNotifications()

  return (
    <>
      <button
        onClick={() => {
          triggerHaptic()
          setIsOpen(true)
        }}
        className="relative p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors focus:outline-none touch-target flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
export default NotificationBell
