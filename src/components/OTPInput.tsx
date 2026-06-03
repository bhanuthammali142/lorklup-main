// src/components/OTPInput.tsx
import React, { useState, useRef, useEffect } from 'react'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (otp: string) => void
  onComplete?: (otp: string) => void
  onResend?: () => void
  resendCooldown?: number // in seconds
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  onResend,
  resendCooldown = 30
}: OTPInputProps) {
  const [timer, setTimer] = useState(resendCooldown)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<HTMLInputElement[]>([])

  // Cooldown countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true)
      return
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleTextChange = (text: string, index: number) => {
    // Keep only numbers
    const cleanText = text.replace(/[^0-9]/g, '')
    if (!cleanText) return

    const newOTP = value.split('')
    newOTP[index] = cleanText.substring(cleanText.length - 1) // keep last digit
    const otpValue = newOTP.join('')
    onChange(otpValue)

    // Focus next box
    if (index < length - 1 && cleanText) {
      inputRefs.current[index + 1]?.focus()
    }

    // Trigger complete
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOTP = value.split('')
      
      // If current input is empty, focus previous and clear it
      if (!newOTP[index] && index > 0) {
        newOTP[index - 1] = ''
        onChange(newOTP.join(''))
        inputRefs.current[index - 1]?.focus()
      } else {
        newOTP[index] = ''
        onChange(newOTP.join(''))
      }
    }
  }

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    const cleanData = pastedData.replace(/[^0-9]/g, '').substring(0, length)
    
    if (cleanData) {
      onChange(cleanData)
      const lastFocusIdx = Math.min(cleanData.length, length - 1)
      inputRefs.current[lastFocusIdx]?.focus()
      
      if (cleanData.length === length && onComplete) {
        onComplete(cleanData)
      }
    }
  }

  const triggerResend = () => {
    if (!canResend) return
    setTimer(resendCooldown)
    setCanResend(false)
    if (onResend) {
      onResend()
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-2.5" onPaste={handlePaste}>
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            ref={(el) => {
              if (el) inputRefs.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[idx] || ''}
            onChange={(e) => handleTextChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className="w-11 h-13 sm:w-12 sm:h-14 bg-slate-900 border border-slate-800 rounded-xl text-center text-lg font-black text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-150 shadow-inner"
            aria-label={`Digit ${idx + 1}`}
          />
        ))}
      </div>

      <div className="flex justify-between items-center w-full max-w-xs text-xs font-semibold">
        {canResend ? (
          <button
            type="button"
            onClick={triggerResend}
            className="text-blue-500 hover:text-blue-400 cursor-pointer active:scale-95 transition-all"
          >
            Resend Verification Code
          </button>
        ) : (
          <span className="text-slate-500">
            Resend code in <strong className="text-slate-400">{timer}s</strong>
          </span>
        )}
      </div>
    </div>
  )
}
export default OTPInput
