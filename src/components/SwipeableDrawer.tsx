// src/components/SwipeableDrawer.tsx
import React, { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

interface SwipeableDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'bottom' | 'right' | 'left'
  className?: string
}

export function SwipeableDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  className
}: SwipeableDrawerProps) {
  const [startY, setStartY] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [isRendered, setIsRendered] = useState(isOpen)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      setIsRendered(true)
      document.body.style.overflow = 'hidden' // lock scroll
      window.addEventListener('keydown', handleKeyDown)
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300) // matches transition duration
      document.body.style.overflow = ''
      return () => {
        clearTimeout(timer)
        window.removeEventListener('keydown', handleKeyDown)
      }
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Mobile gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (position === 'bottom') {
      setStartY(e.touches[0].clientY)
    } else if (position === 'left' || position === 'right') {
      setStartX(e.touches[0].clientX)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (position === 'bottom') {
      const diff = e.touches[0].clientY - startY
      if (diff > 0) {
        setOffsetY(diff)
      }
    } else if (position === 'left') {
      const diff = startX - e.touches[0].clientX
      if (diff > 0) {
        setOffsetX(-diff)
      }
    } else if (position === 'right') {
      const diff = e.touches[0].clientX - startX
      if (diff > 0) {
        setOffsetX(diff)
      }
    }
  }

  const handleTouchEnd = () => {
    if (position === 'bottom') {
      if (offsetY > 120) {
        onClose()
      }
      setOffsetY(0)
    } else if (position === 'left') {
      if (offsetX < -120) {
        onClose()
      }
      setOffsetX(0)
    } else if (position === 'right') {
      if (offsetX > 120) {
        onClose()
      }
      setOffsetX(0)
    }
  }

  if (!isRendered) return null

  // Styles based on position
  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] border-t border-slate-800 translate-y-0',
    right: 'right-0 top-0 bottom-0 w-80 border-l border-slate-800 translate-x-0',
    left: 'left-0 top-0 bottom-0 w-80 border-r border-slate-800 translate-x-0'
  }

  const transformStyle = () => {
    if (!isOpen) {
      if (position === 'bottom') return 'translateY(100%)'
      if (position === 'left') return 'translateX(-100%)'
      if (position === 'right') return 'translateX(100%)'
    }

    if (position === 'bottom') return `translateY(${offsetY}px)`
    if (position === 'left') return `translateX(${offsetX}px)`
    if (position === 'right') return `translateX(${offsetX}px)`

    return 'none'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-stretch">
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div 
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: transformStyle(),
          paddingBottom: position === 'bottom' ? 'var(--safe-area-bottom)' : '0px'
        }}
        className={cn(
          "fixed bg-slate-950 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 ease-out overflow-hidden",
          positionClasses[position],
          className
        )}
      >
        {/* Notch Indicator for bottom sheet drag */}
        {position === 'bottom' && (
          <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto my-3 shrink-0" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-900 shrink-0">
          <h3 className="font-black text-white text-base tracking-tight">{title || 'Details'}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white touch-target flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
          {children}
        </div>
      </div>
    </div>
  )
}
export default SwipeableDrawer
