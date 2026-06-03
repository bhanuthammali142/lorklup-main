// src/App.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './lib/AuthContext'
import { AdminRoute, StudentRoute, SuperAdminRoute } from './lib/RouteGuards'
import { ErrorBoundary, PageSkeleton } from './components/ErrorBoundary'

// ── Auth ─────────────────────────────────────────────────────────────────────
import { Login } from './pages/Login'
import { AuthCallbackPage } from './auth/AuthCallbackPage'

// ── Admin layout ─────────────────────────────────────────────────────────────
import { AdminLayout } from './admin/AdminLayout'

// ── Admin pages (lazy) ───────────────────────────────────────────────────────
const AdminDashboard      = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const AdminStudents       = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })))
const AdminRooms          = lazy(() => import('./pages/Rooms').then(m => ({ default: m.Rooms })))
const AdminFees           = lazy(() => import('./pages/Fees').then(m => ({ default: m.Fees })))
const AdminAnalytics      = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })))
const AdminAttendance     = lazy(() => import('./pages/Attendance').then(m => ({ default: m.Attendance })))
const AdminComplaints     = lazy(() => import('./pages/Complaints').then(m => ({ default: m.Complaints })))
const AdminAnnouncements  = lazy(() => import('./pages/Announcements').then(m => ({ default: m.Announcements })))
const AdminSettings       = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const AdminBilling        = lazy(() => import('./admin/pages/Billing').then(m => ({ default: m.Billing })))

// ── Student layout + pages (lazy) ────────────────────────────────────────────
const StudentLayout        = lazy(() => import('./student/StudentLayout').then(m => ({ default: m.StudentLayout })))
const StudentDashboard     = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const StudentAttendance    = lazy(() => import('./pages/student/StudentAttendance').then(m => ({ default: m.StudentAttendance })))
const StudentFees          = lazy(() => import('./pages/student/StudentFees').then(m => ({ default: m.StudentFees })))
const StudentComplaints    = lazy(() => import('./pages/student/StudentComplaints').then(m => ({ default: m.StudentComplaints })))
const StudentAnnouncements = lazy(() => import('./pages/student/StudentAnnouncements').then(m => ({ default: m.StudentAnnouncements })))
const StudentFoodMenu      = lazy(() => import('./pages/student/StudentFoodMenu').then(m => ({ default: m.StudentFoodMenu })))
const StudentProfile       = lazy(() => import('./pages/student/StudentProfile').then(m => ({ default: m.StudentProfile })))
const StudentRewards       = lazy(() => import('./pages/student/StudentRewards').then(m => ({ default: m.StudentRewards })))

// ── Super Admin (lazy) ───────────────────────────────────────────────────────
const SuperAdminLayout        = lazy(() => import('./super-admin/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })))
const SuperAdminDashboard     = lazy(() => import('./super-admin/pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })))
const SuperAdminHostels       = lazy(() => import('./super-admin/pages/SuperAdminHostels').then(m => ({ default: m.SuperAdminHostels })))
const SuperAdminUsers         = lazy(() => import('./super-admin/pages/SuperAdminUsers').then(m => ({ default: m.SuperAdminUsers })))
const SuperAdminFinance       = lazy(() => import('./super-admin/pages/SuperAdminFinance').then(m => ({ default: m.SuperAdminFinance })))
const SuperAdminComplaints    = lazy(() => import('./super-admin/pages/SuperAdminComplaints').then(m => ({ default: m.SuperAdminComplaints })))
const SuperAdminAuditLogs     = lazy(() => import('./super-admin/pages/SuperAdminAuditLogs').then(m => ({ default: m.SuperAdminAuditLogs })))
const SuperAdminSubscriptions = lazy(() => import('./super-admin/pages/SuperAdminSubscriptions').then(m => ({ default: m.SuperAdminSubscriptions })))
const SuperAdminTickets       = lazy(() => import('./super-admin/pages/SuperAdminTickets').then(m => ({ default: m.SuperAdminTickets })))
const SuperAdminSettings      = lazy(() => import('./super-admin/pages/SuperAdminSettings').then(m => ({ default: m.SuperAdminSettings })))
const SuperAdminDeployGuide   = lazy(() => import('./super-admin/pages/DeployGuide').then(m => ({ default: m.DeployGuide })))

const Fallback = () => <PageSkeleton />

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '13px',
            },
          }}
        />
        <Routes>
          {/* ── Public / Auth ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* ── Admin ── */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={
              <ErrorBoundary><AdminLayout /></ErrorBoundary>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<Suspense fallback={<Fallback />}><AdminDashboard /></Suspense>} />
              <Route path="students"      element={<Suspense fallback={<Fallback />}><AdminStudents /></Suspense>} />
              <Route path="rooms"         element={<Suspense fallback={<Fallback />}><AdminRooms /></Suspense>} />
              <Route path="fees"          element={<Suspense fallback={<Fallback />}><AdminFees /></Suspense>} />
              <Route path="analytics"     element={<Suspense fallback={<Fallback />}><AdminAnalytics /></Suspense>} />
              <Route path="attendance"    element={<Suspense fallback={<Fallback />}><AdminAttendance /></Suspense>} />
              <Route path="complaints"    element={<Suspense fallback={<Fallback />}><AdminComplaints /></Suspense>} />
              <Route path="announcements" element={<Suspense fallback={<Fallback />}><AdminAnnouncements /></Suspense>} />
              <Route path="settings"      element={<Suspense fallback={<Fallback />}><AdminSettings /></Suspense>} />
              <Route path="billing"       element={<Suspense fallback={<Fallback />}><AdminBilling /></Suspense>} />
              <Route path="*"             element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Student ── */}
          <Route element={<StudentRoute />}>
            <Route path="/student" element={
              <ErrorBoundary>
                <Suspense fallback={<Fallback />}><StudentLayout /></Suspense>
              </ErrorBoundary>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<Suspense fallback={<Fallback />}><StudentDashboard /></Suspense>} />
              <Route path="attendance"    element={<Suspense fallback={<Fallback />}><StudentAttendance /></Suspense>} />
              <Route path="fees"          element={<Suspense fallback={<Fallback />}><StudentFees /></Suspense>} />
              <Route path="complaints"    element={<Suspense fallback={<Fallback />}><StudentComplaints /></Suspense>} />
              <Route path="announcements" element={<Suspense fallback={<Fallback />}><StudentAnnouncements /></Suspense>} />
              <Route path="food"          element={<Suspense fallback={<Fallback />}><StudentFoodMenu /></Suspense>} />
              <Route path="profile"       element={<Suspense fallback={<Fallback />}><StudentProfile /></Suspense>} />
              <Route path="rewards"       element={<Suspense fallback={<Fallback />}><StudentRewards /></Suspense>} />
              <Route path="*"             element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Super Admin ── */}
          <Route element={<SuperAdminRoute />}>
            <Route path="/superadmin" element={
              <ErrorBoundary>
                <Suspense fallback={<Fallback />}><SuperAdminLayout /></Suspense>
              </ErrorBoundary>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<Suspense fallback={<Fallback />}><SuperAdminDashboard /></Suspense>} />
              <Route path="hostels"       element={<Suspense fallback={<Fallback />}><SuperAdminHostels /></Suspense>} />
              <Route path="users"         element={<Suspense fallback={<Fallback />}><SuperAdminUsers /></Suspense>} />
              <Route path="finance"       element={<Suspense fallback={<Fallback />}><SuperAdminFinance /></Suspense>} />
              <Route path="complaints"    element={<Suspense fallback={<Fallback />}><SuperAdminComplaints /></Suspense>} />
              <Route path="audit-logs"    element={<Suspense fallback={<Fallback />}><SuperAdminAuditLogs /></Suspense>} />
              <Route path="subscriptions" element={<Suspense fallback={<Fallback />}><SuperAdminSubscriptions /></Suspense>} />
              <Route path="tickets"       element={<Suspense fallback={<Fallback />}><SuperAdminTickets /></Suspense>} />
              <Route path="settings"      element={<Suspense fallback={<Fallback />}><SuperAdminSettings /></Suspense>} />
              <Route path="deploy"        element={<Suspense fallback={<Fallback />}><SuperAdminDeployGuide /></Suspense>} />
              <Route path="*"             element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Default: redirect to login ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App