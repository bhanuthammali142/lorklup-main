import React, { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { apiAuth } from '../lib/api-client'
import toast from 'react-hot-toast'

/**
 * Shown to students on first login when they have a temp password.
 * Forces them to set a new password before accessing the dashboard.
 */
export function ChangePasswordPrompt({ onComplete }: { onComplete: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      return toast.error('Current password is required')
    }
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters')
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match')
    }

    setSaving(true)
    try {
      await apiAuth.changePassword(newPassword, currentPassword)
      toast.success('Password updated successfully!')
      onComplete()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Change Your Password</h2>
          <p className="text-slate-500 text-sm mt-2">
            Please enter your current temporary password and choose a new secure password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Current (Temporary) Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your temporary password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              minLength={8}
              required
            />
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-rose-500 font-medium">Passwords do not match</p>
          )}

          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className="text-xs text-amber-500 font-medium">Password must be at least 8 characters</p>
          )}

          <button
            type="submit"
            disabled={!isValid || saving}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Set New Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
