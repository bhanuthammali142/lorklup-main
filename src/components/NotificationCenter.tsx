// src/components/NotificationCenter.tsx
import { SwipeableDrawer } from './SwipeableDrawer'
import { useNotifications } from '../lib/useNotifications'
import type { Notification } from '../lib/useNotifications'
import { Bell, CreditCard, Calendar, MessageSquareWarning, Megaphone, AlertCircle, Eye } from 'lucide-react'
import { cn } from '../lib/utils'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'fee': return <CreditCard className="h-4 w-4 text-rose-400" />
      case 'attendance': return <Calendar className="h-4 w-4 text-emerald-400" />
      case 'complaint': return <MessageSquareWarning className="h-4 w-4 text-amber-400" />
      case 'announcement': return <Megaphone className="h-4 w-4 text-blue-400" />
      case 'emergency': return <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />
      default: return <Bell className="h-4 w-4 text-slate-400" />
    }
  }

  const getTypeBadge = (type: Notification['type']) => {
    const commonClass = "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border"
    switch (type) {
      case 'fee': return <span className={cn(commonClass, "bg-rose-500/10 text-rose-400 border-rose-500/25")}>Fee Invoice</span>
      case 'attendance': return <span className={cn(commonClass, "bg-emerald-500/10 text-emerald-400 border-emerald-500/25")}>Attendance</span>
      case 'complaint': return <span className={cn(commonClass, "bg-amber-500/10 text-amber-400 border-amber-500/25")}>Complaint</span>
      case 'announcement': return <span className={cn(commonClass, "bg-blue-500/10 text-blue-400 border-blue-500/25")}>Announcement</span>
      case 'emergency': return <span className={cn(commonClass, "bg-rose-500/20 text-rose-400 border-rose-500/30")}>Emergency</span>
      default: return null
    }
  }

  return (
    <SwipeableDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Inbox (${unreadCount} unread)`}
      position="right"
    >
      <div className="flex flex-col h-full space-y-4">
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-right text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center justify-end gap-1 mb-2"
          >
            <Eye className="h-3.5 w-3.5" /> Mark all as read
          </button>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-xs text-slate-500 animate-pulse">Loading updates...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Bell className="h-10 w-10 mx-auto opacity-20 mb-3" />
            <p className="font-bold text-sm">Inbox is empty</p>
            <p className="text-xs mt-1 text-slate-600">You're all caught up with your hostel!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {notifications.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  if (!item.is_read) {
                    markRead(item.id)
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-150 flex gap-3 text-left relative overflow-hidden group cursor-pointer",
                  item.is_read 
                    ? "bg-slate-950/40 border-slate-900/60" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-750"
                )}
              >
                {/* Visual indicator for unread */}
                {!item.is_read && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-blue-500" />
                )}

                <div className="h-8 w-8 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(item.type)}
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  
                  <h4 className="text-xs font-black text-slate-200 mt-2">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SwipeableDrawer>
  )
}
export default NotificationCenter
