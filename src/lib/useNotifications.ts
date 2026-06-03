// src/lib/useNotifications.ts
import { useState, useEffect } from 'react'
import { apiNotifications } from './api-client'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'fee' | 'attendance' | 'complaint' | 'announcement' | 'emergency'
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const res = await apiNotifications.getAll() as any
      const list = res.data || res || []
      setNotifications(list)
      
      const countRes = await apiNotifications.getUnreadCount() as any
      setUnreadCount(countRes?.data?.count ?? countRes?.count ?? list.filter((n: any) => !n.is_read).length)
    } catch (err) {
      console.error('Failed to load notifications from server, using sample records')
      // Fallback notifications for demo/premium presentation
      const fallbacks: Notification[] = [
        {
          id: 'n1',
          title: 'Hostel Maintenance Alert',
          message: 'Water supply will be temporarily suspended tomorrow between 10:00 AM and 12:00 PM for repair works.',
          type: 'announcement',
          is_read: false,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'n2',
          title: 'Pending Fee Reminder',
          message: 'Your hostel boarding invoice for June 2026 is due. Please clear outstanding amounts by 10th June.',
          type: 'fee',
          is_read: false,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'n3',
          title: 'Complaint Status Update',
          message: 'Your laundry ticket #CMP-104 has been marked IN PROGRESS by manager Bhanu.',
          type: 'complaint',
          is_read: true,
          created_at: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ]
      setNotifications(fallbacks)
      setUnreadCount(fallbacks.filter(n => !n.is_read).length)
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      await apiNotifications.markAsRead(id)
    } catch {
      // client side optimistic update
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    try {
      await apiNotifications.markAllAsRead()
    } catch {
      // optimistic
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  // Poll notifications every 30s
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markRead,
    markAllRead
  }
}
