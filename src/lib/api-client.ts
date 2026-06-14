// HostelOS API Client
// Backend: https://hostelos-yis2.onrender.com

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const BASE_URL = envApiUrl.replace(/\/api$/, '')

// ── Types ────────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: number
  name: string
  email: string
  phone?: string
  role: 'super_admin' | 'admin' | 'student'
  hostel_id: string | null
  bank_name?: string
  account_holder?: string
  account_number?: string
  ifsc_code?: string
}

// ── Token Helpers ────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('hostelOS_token')
}

export function setToken(token: string) {
  localStorage.setItem('hostelOS_token', token)
}

export function clearToken() {
  localStorage.removeItem('hostelOS_token')
  localStorage.removeItem('hostelOS_user')
}

export function getStoredUser(): ApiUser | null {
  const raw = localStorage.getItem('hostelOS_user')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed.user || parsed
  } catch {
    return null
  }
}

export function setStoredUser(user: ApiUser) {
  localStorage.setItem('hostelOS_user', JSON.stringify(user))
}

// ── Core Request Function ─────────────────────────────────────────────────────
async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/register')

  // Block unauthenticated requests (except auth routes)
  if (!token && !isAuthRoute) {
    clearToken()
    window.location.href = '/login'
    throw new Error('No authentication token found. Please log in.')
  }

  const url = `${BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Cannot connect to server. Please check your internet connection.')
  }

  // Handle 401 - token expired
  if (res.status === 401 && !isAuthRoute) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server returned invalid response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    const errData = data as { error?: string; message?: string }
    throw new Error(errData?.error || errData?.message || `Request failed (HTTP ${res.status})`)
  }

  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiAuth = {
  login: async (email: string, password: string) => {
    const response = await request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(response.token)
    setStoredUser(response.user)
    return response
  },

  me: () => request<ApiUser>('/auth/me'),

  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  changePassword: (newPassword: string) =>
    request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),

  updateProfile: (name: string, phone: string, email: string, bank_name?: string, account_holder?: string, account_number?: string, ifsc_code?: string) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, phone, email, bank_name, account_holder, account_number, ifsc_code }),
    }),
}

// ── Hostels ──────────────────────────────────────────────────────────────────
export const apiHostels = {
  getAll: async () => {
    const response = await request<{ success: boolean; data: unknown[] } | unknown[]>('/api/hostels')
    if (Array.isArray(response)) return response
    if (response && typeof response === 'object' && 'data' in (response as object)) {
      return (response as { data: unknown[] }).data || []
    }
    return []
  },

  create: (data: unknown) =>
    request('/api/hostels', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: unknown) =>
    request(`/api/hostels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  createWithOwner: (data: unknown) =>
    request('/api/hostels/create-with-owner', { method: 'POST', body: JSON.stringify(data) }),

  onboardAdmin: (data: unknown) =>
    request('/api/hostels/onboard', { method: 'POST', body: JSON.stringify(data) }),

  bulkCreate: (hostels: unknown[]) =>
    request('/api/hostels/bulk', { method: 'POST', body: JSON.stringify({ hostels }) }),
}

// ── Students ─────────────────────────────────────────────────────────────────
export const apiStudents = {
  getAll: (hostelId: string) =>
    hostelId ? request<unknown[]>(`/api/students?hostel_id=${hostelId}`) : Promise.resolve([]),

  add: (data: unknown) =>
    request('/api/students', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: unknown) =>
    request(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/api/students/${id}`, { method: 'DELETE' }),

  bulkCreate: (students: unknown[], hostelId?: string) =>
    request('/api/students/bulk', { method: 'POST', body: JSON.stringify({ students, hostel_id: hostelId }) }),

  getSelfProfile: () =>
    request<unknown>('/api/students/profile/me'),
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const apiRooms = {
  getAll: (hostelId: string) =>
    hostelId ? request<unknown[]>(`/api/rooms?hostel_id=${hostelId}`) : Promise.resolve([]),

  add: (data: unknown) =>
    request('/api/rooms', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: unknown) =>
    request(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/api/rooms/${id}`, { method: 'DELETE' }),
}

// ── Fees ──────────────────────────────────────────────────────────────────────
export const apiFees = {
  getAll: (hostelId: string) =>
    hostelId ? request<unknown[]>(`/api/fees?hostel_id=${hostelId}`) : Promise.resolve([]),

  add: (data: unknown) =>
    request('/api/fees', { method: 'POST', body: JSON.stringify(data) }),

  generateBulk: (data: unknown) =>
    request('/api/fees/generate-bulk', { method: 'POST', body: JSON.stringify(data) }),

  processPayment: (id: string, data: unknown) =>
    request(`/api/fees/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),

  markOverdue: (hostelId: string) =>
    request('/api/fees/mark-overdue', {
      method: 'POST',
      body: JSON.stringify({ hostel_id: hostelId }),
    }),

  getForStudent: (studentId: string) =>
    studentId ? request<unknown[]>(`/api/fees/student/${studentId}`) : Promise.resolve([]),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const apiDashboard = {
  getStats: (hostelId: string) =>
    request(`/api/dashboard?hostel_id=${hostelId}`),

  getRevenue: (hostelId: string) =>
    request(`/api/dashboard/revenue?hostel_id=${hostelId}`),

  getOccupancy: (hostelId: string) =>
    request(`/api/dashboard/occupancy?hostel_id=${hostelId}`),
}

// ── Complaints ────────────────────────────────────────────────────────────────
export const apiComplaints = {
  getAll: (hostelId: string) =>
    hostelId ? request<unknown[]>(`/api/complaints?hostel_id=${hostelId}`) : Promise.resolve([]),

  add: (data: unknown) =>
    request('/api/complaints', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: unknown) =>
    request(`/api/complaints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Announcements ─────────────────────────────────────────────────────────────
export const apiAnnouncements = {
  getAll: (hostelId: string) =>
    hostelId ? request<unknown[]>(`/api/announcements?hostel_id=${hostelId}`) : Promise.resolve([]),

  add: (data: unknown) =>
    request('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/api/announcements/${id}`, { method: 'DELETE' }),
}

// ── Attendance ────────────────────────────────────────────────────────────────
export const apiAttendance = {
  get: (hostelId: string, date: string) =>
    hostelId ? request<unknown[]>(`/api/attendance?hostel_id=${hostelId}&date=${date}`) : Promise.resolve([]),

  mark: (data: unknown) =>
    request('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Food Menu ─────────────────────────────────────────────────────────────────
export const apiFoodMenu = {
  get: (hostelId: string) =>
    hostelId
      ? request<{ menu: unknown }>(`/api/food-menu?hostel_id=${hostelId}`)
      : Promise.resolve({ menu: null }),

  save: (hostelId: string, menu: unknown) =>
    request('/api/food-menu', {
      method: 'PUT',
      body: JSON.stringify({ hostel_id: hostelId, menu }),
    }),
}

// ── Super Admin ───────────────────────────────────────────────────────────────
export const apiSuperAdmin = {
  // Dashboard
  getDashboard: () =>
    request('/api/super-admin/dashboard'),

  getRevenueSummary: () =>
    request('/api/super-admin/revenue-summary'),

  // Users
  getUsers: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/users${qs ? `?${qs}` : ''}`)
  },

  toggleUserStatus: (id: number, is_active: boolean) =>
    request(`/api/super-admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),

  changeUserRole: (id: number, role: string) =>
    request(`/api/super-admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  resetUserPassword: (id: number, new_password: string) =>
    request(`/api/super-admin/users/${id}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ new_password }),
    }),

  // Hostels
  getHostels: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/hostels${qs ? `?${qs}` : ''}`)
  },

  toggleHostelStatus: (id: string, is_active: boolean) =>
    request(`/api/super-admin/hostels/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),

  // Students
  getStudents: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/students${qs ? `?${qs}` : ''}`)
  },

  // Finance
  getPayments: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/payments${qs ? `?${qs}` : ''}`)
  },

  getFees: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/fees${qs ? `?${qs}` : ''}`)
  },

  // Complaints
  getComplaints: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/complaints${qs ? `?${qs}` : ''}`)
  },

  updateComplaintStatus: (id: string, status: string) =>
    request(`/api/super-admin/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Audit Logs
  getAuditLogs: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/super-admin/audit-logs${qs ? `?${qs}` : ''}`)
  },

  // Notifications
  getNotifications: () =>
    request('/api/super-admin/notifications'),

  sendNotification: (data: unknown) =>
    request('/api/super-admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Platform Billing (SaaS)
  getBillingStats: () =>
    request<{ success: boolean; data: any }>('/api/super-admin/billing/stats'),

  getBillingSubscriptions: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request<{ success: boolean; data: any[] }>(`/api/super-admin/billing/subscriptions${qs ? `?${qs}` : ''}`)
  },

  toggleSubscriptionStatus: (id: string, status: string) =>
    request<{ success: boolean; data: any }>(`/api/super-admin/billing/subscriptions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getBillingSettings: () =>
    request<{ success: boolean; data: any }>('/api/super-admin/billing/settings'),

  updateBillingSettings: (settings: Record<string, string>) =>
    request<{ success: boolean; message: string }>('/api/super-admin/billing/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const apiNotifications = {
  getAll: () =>
    request<{ success: boolean; data: any[] }>('/api/notifications'),

  getUnreadCount: () =>
    request<{ success: boolean; data: { count: number } }>('/api/notifications/unread-count'),

  markAsRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () =>
    request('/api/notifications/read-all', { method: 'PATCH' }),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const apiPayments = {
  createOrder: (data: { fee_id: string; amount: number; hostel_id: string }) =>
    request<{ success: boolean; data: { order_id: string; amount: number; convenience_fee: number; total_amount: number } }>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; fee_id: string }) =>
    request('/api/payments/verify-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (hostelId: string, studentId?: string) => {
    const params = new URLSearchParams({ hostel_id: hostelId })
    if (studentId) params.append('student_id', studentId)
    return request<{ success: boolean; data: any[] }>(`/api/payments/history?${params}`)
  },
}

// ── Rewards ───────────────────────────────────────────────────────────────────
export const apiRewards = {
  getLeaderboard: (hostelId: string, period = 'monthly') =>
    request<{ success: boolean; data: any[] }>(`/api/rewards/leaderboard?hostel_id=${hostelId}&period=${period}`),

  getStudentRewards: (studentId: string) =>
    request<{ success: boolean; data: { total_points: number; history: any[] } }>(`/api/rewards/student/${studentId}`),

  award: (data: { student_id: string; hostel_id: string; points: number; reason: string }) =>
    request('/api/rewards/award', { method: 'POST', body: JSON.stringify(data) }),

  redeem: (data: { student_id: string; hostel_id: string; points_cost: number; reward_name: string }) =>
    request('/api/rewards/redeem', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Billing ───────────────────────────────────────────────────────────────────
export const apiBilling = {
  getMySubscription: () =>
    request<{ success: boolean; data: any }>('/api/billing/my-subscription'),

  subscribe: (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') =>
    request<{ success: boolean; data: any }>('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
    }),

  verify: (data: any) =>
    request<{ success: boolean; message: string }>('/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}