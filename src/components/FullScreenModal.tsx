// src/components/FullScreenModal.tsx
import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

interface FullScreenModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function FullScreenModal({
  isOpen,
  onClose,
  title,
  children,
  className
}: FullScreenModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div 
        className={cn(
          "relative bg-slate-900 text-slate-100 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl border border-slate-800 shadow-2xl flex flex-col transition-all duration-300 md:animate-in md:fade-in md:zoom-in-95 overflow-hidden",
          className
        )}
        style={{ 
          paddingTop: 'var(--safe-area-top)',
          paddingBottom: 'var(--safe-area-bottom)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal view'}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <h3 className="font-black text-white text-base tracking-tight">{title || 'Details'}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-white touch-target flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 scrollbar-none">
          {children}
        </div>
      </div>
    </div>
  )
}
export default FullScreenModal
