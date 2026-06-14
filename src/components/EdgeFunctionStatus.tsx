/**
 * EdgeFunctionStatus — Fixed: now checks Express backend health endpoint
 * instead of Supabase edge function URL
 */
import { useState, useEffect } from 'react'
import { Server, CheckCircle2, XCircle } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export function EdgeFunctionStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const checkStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        setStatus('online')
      } else {
        setStatus('offline')
      }
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-500 animate-pulse">
        <Server className="h-3 w-3" />
        Checking backend...
      </div>
    )
  }

  if (status === 'online') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Backend: Online
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-700 shadow-sm">
      <XCircle className="h-3.5 w-3.5" />
      Backend: Offline
    </div>
  )
}
