// src/lib/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  apiAuth, apiStudents, clearToken,
  setStoredUser, type ApiUser, initStoredAuth,
  getToken, getStoredUser
} from './api-client'

export interface StudentData {
  id: string
  hostel_id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string
  parent_phone: string | null
  id_number?: string | null
  college_name?: string | null
  branch?: string | null
  joining_date: string
  is_verified: boolean
  aadhaar_number?: string | null
  profile_photo?: string | null
  must_change_password?: boolean
  room_id?: string | null
  bed_id?: string | null
  room_number?: string | null
  bed_number?: string | null
  room_type?: string | null
  monthly_fee?: number | null
  rooms?: { room_number: string; floor?: string | null; type?: string | null } | null
  beds?: { bed_number: string } | null
  [key: string]: any // Allow additional dynamic properties
}

interface AuthContextType {
  user: ApiUser | null
  role: 'super_admin' | 'admin' | 'student' | null
  hostelId: string | null
  signOut: () => void
  setUser: (u: ApiUser) => void
  loading: boolean
  session: unknown
  studentData: StudentData | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  hostelId: null,
  signOut: () => {},
  setUser: () => {},
  loading: true,
  session: null,
  studentData: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<ApiUser | null>(null)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)

  /** Load the student profile for a student user */
  const loadStudentData = useCallback(async (apiUser: ApiUser) => {
    if (apiUser.role !== 'student') return
    try {
      const record = await apiStudents.getSelfProfile() as StudentData
      if (record) setStudentData(record)
    } catch (err) {
      console.error('[AuthContext] loadStudentData failed:', err)
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initStoredAuth()
        const token = getToken()
        const storedUser = getStoredUser()

        if (!token || !storedUser) {
          setLoading(false)
          return
        }

        setUserState(storedUser)

        if (storedUser.role === 'student') {
          await loadStudentData(storedUser)
        }

        setLoading(false)

        // Refresh token/user from API in background
        apiAuth.me()
          .then(async (fresh) => {
            setUserState(fresh)
            await setStoredUser(fresh)
            if (fresh.role === 'student') {
              await loadStudentData(fresh)
            }
          })
          .catch(() => {
            // Token expired — sign out silently
            clearToken()
            setUserState(null)
            setStudentData(null)
          })
      } catch (err) {
        console.error('[AuthContext] Auth initialization failed:', err)
        clearToken()
        setLoading(false)
      }
    }

    initializeAuth()
  }, [loadStudentData])

  const setUser = useCallback(async (u: ApiUser) => {
    setUserState(u)
    await setStoredUser(u)
    if (u.role === 'student') {
      await loadStudentData(u)
    }
  }, [loadStudentData])

  const signOut = () => {
    clearToken()
    setUserState(null)
    setStudentData(null)
    window.location.href = '/login'
  }

  const role = user?.role ?? null
  const hostelId = user?.hostel_id ?? null

  const value: AuthContextType = {
    user,
    role,
    hostelId,
    signOut,
    setUser,
    loading,
    session: user ? { user } : null,
    studentData,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">HostelOS</p>
            <p className="text-xs text-slate-400 mt-0.5">Verifying your account...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)