// src/components/PullToRefresh.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<any>
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0)
  const [pullOffset, setPullOffset] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const pullThreshold = 80 // pixels needed to pull down to refresh

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh if scrolled to top
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY)
      } else {
        setStartY(0)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0 || refreshing) return
      
      const currentY = e.touches[0].clientY
      const diff = currentY - startY
      
      if (diff > 0) {
        // Apply resistance curve to pull distance
        const offset = Math.min(diff * 0.4, pullThreshold + 20)
        setPullOffset(offset)
        
        // Prevent default scrolling down behavior
        if (e.cancelable) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (startY === 0 || refreshing) return
      
      if (pullOffset >= pullThreshold) {
        setRefreshing(true)
        setPullOffset(pullThreshold)
        
        try {
          if (navigator.vibrate) {
            navigator.vibrate(15) // trigger short haptic vibration
          }
          await onRefresh()
        } catch (err) {
          console.error('Refresh error', err)
        } finally {
          setRefreshing(false)
          setPullOffset(0)
        }
      } else {
        setPullOffset(0)
      }
      setStartY(0)
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [startY, pullOffset, refreshing, onRefresh])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none transition-all duration-200 z-50"
        style={{ 
          top: `${pullOffset - 40}px`,
          opacity: pullOffset > 10 ? 1 : 0
        }}
      >
        <div className="bg-slate-900 border border-slate-800 rounded-full p-2 shadow-lg flex items-center justify-center">
          {refreshing ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <svg 
              className="h-5 w-5 text-blue-500 transition-transform duration-100" 
              style={{ transform: `rotate(${pullOffset * 4}deg)` }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content wrapper */}
      <div 
        className="transition-transform duration-200"
        style={{ 
          transform: pullOffset > 0 ? `translateY(${pullOffset}px)` : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}
export default PullToRefresh
