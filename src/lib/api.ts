// @ts-nocheck
/**
 * api.ts — MySQL backend version
 * All Supabase calls have been replaced with REST API calls via api-client.ts
 */

import {
  apiStudents, apiRooms, apiFees, apiDashboard,
  apiComplaints, apiAnnouncements, apiAttendance, apiFoodMenu
} from './api-client'

// ─── HOSTEL ──────────────────────────────────────────────────────────────────

export async function getOrCreateHostel(userId: string, hostelId?: string) {
  // With MySQL/PostgreSQL backend, hostel is fetched by the backend via token
  const { apiHostels } = await import('./api-client')
  const hostels = await apiHostels.getAll()
  const raw = hostels[0]
  if (!raw) return null
  return {
    id: String(raw.id),
    owner_id: String(raw.owner_id),
    name: raw.hostel_name ?? '',
    address: raw.address_line1 ?? '',
    contact_phone: raw.phone ?? '',
    contact_email: raw.email ?? '',
    created_at: raw.created_at ?? '',
  }
}

export async function updateHostel(hostelId: string, payload: any) {
  const { apiHostels } = await import('./api-client')
  const dbPayload: any = {}
  if ('name' in payload) dbPayload.hostel_name = payload.name
  if ('address' in payload) dbPayload.address_line1 = payload.address
  if ('contact_phone' in payload) dbPayload.phone = payload.contact_phone
  if ('contact_email' in payload) dbPayload.email = payload.contact_email
  return apiHostels.update(hostelId, dbPayload)
}

export async function bulkCreateHostels(hostels: any[]) {
  const { apiHostels } = await import('./api-client')
  return apiHostels.bulkCreate(hostels)
}

export async function updateProfile(name: string, phone: string, email: string, bank_name?: string, account_holder?: string, account_number?: string, ifsc_code?: string) {
  const { apiAuth } = await import('./api-client')
  return apiAuth.updateProfile(name, phone, email, bank_name, account_holder, account_number, ifsc_code)
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────

export async function getStudents(hostelId: string) {
  return apiStudents.getAll(hostelId)
}

export async function addStudent(payload: any) {
  const result = await apiStudents.add(payload)
  return { student: result.student, credentials: result.credentials }
}

export async function updateStudent(id: string, payload: any) {
  return apiStudents.update(id, payload)
}

export async function deleteStudent(id: string) {
  return apiStudents.delete(id)
}

export async function bulkAddStudents(students: any[], hostelId?: string) {
  return apiStudents.bulkCreate(students, hostelId)
}

// ─── ROOMS + BEDS ────────────────────────────────────────────────────────────

export async function getRoomsWithBeds(hostelId: string) {
  const rooms = await apiRooms.getAll(hostelId)
  return rooms.map((r: any) => ({
    ...r,
    beds: typeof r.beds === 'string' ? JSON.parse(r.beds) : (r.beds || []),
  }))
}

export async function addRoom(payload: any) {
  return apiRooms.add(payload)
}

export async function updateRoom(roomId: string, payload: any) {
  return apiRooms.update(roomId, payload)
}

// ─── FEES ────────────────────────────────────────────────────────────────────

export async function getFees(hostelId: string) {
  return apiFees.getAll(hostelId)
}

export async function addFeeRecord(payload: any) {
  return apiFees.add(payload)
}

export async function processPayment(
  feeId: string,
  hostelId: string,
  studentId: string,
  amountPaid: number,
  totalAmount: number,
  currentPaid: number,
  paymentMethod: string,
  paidAtDate: string
) {
  const result = await apiFees.processPayment(feeId, {
    amount_paid: amountPaid,
    payment_method: paymentMethod,
    paid_at: paidAtDate,
  })
  return { receipt_id: result.receipt_id, newStatus: result.status }
}

export async function autoMarkOverdue(hostelId: string) {
  return apiFees.markOverdue(hostelId)
}

export async function generateBulkFees(hostelId: string, monthDate: string, dueDate: string) {
  return apiFees.generateBulk({ hostel_id: hostelId, month: monthDate, due_date: dueDate })
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats(hostelId: string) {
  return apiDashboard.getStats(hostelId)
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function getRevenueByMonth(hostelId: string) {
  return apiDashboard.getRevenue(hostelId)
}

export async function getOccupancyByMonth(hostelId: string) {
  return apiDashboard.getOccupancy(hostelId)
}

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────

export async function getComplaints(hostelId: string) {
  return apiComplaints.getAll(hostelId)
}

export async function updateComplaintStatus(id: string, payload: any) {
  return apiComplaints.update(id, payload)
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

export async function getAnnouncements(hostelId: string) {
  return apiAnnouncements.getAll(hostelId)
}

export async function addAnnouncement(payload: any) {
  return apiAnnouncements.add(payload)
}

export async function deleteAnnouncement(id: string) {
  return apiAnnouncements.delete(id)
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export async function getAttendanceByDate(hostelId: string, date: string) {
  const rows = await apiAttendance.get(hostelId, date)
  return rows.map((r: any) => ({
    ...r,
    rooms: { room_number: r.room_number },
    attendance: r.attendance_status ? [{ status: r.attendance_status }] : [],
  }))
}

export async function markAttendance(hostelId: string, studentId: string, date: string, status: string) {
  return apiAttendance.mark({ hostel_id: hostelId, student_id: studentId, date, status })
}

// ─── FOOD MENU ────────────────────────────────────────────────────────────────

export async function getFoodMenu(hostelId: string) {
  const result = await apiFoodMenu.get(hostelId)
  return result.menu
}

export async function saveFoodMenu(hostelId: string, menu: any) {
  return apiFoodMenu.save(hostelId, menu)
}

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────

export function exportStudentsCSV(students: any[]) {
  const headers = ['Name', 'ID Number', 'College', 'Branch', 'Phone', 'Parent Phone', 'Room', 'Bed', 'Joining Date', 'Verified']
  const rows = students.map(s => [
    s.full_name, s.id_number ?? '', s.college_name ?? '', s.branch ?? '',
    s.phone, s.parent_phone ?? '',
    s.room_number ?? 'Unassigned',
    s.bed_number ?? '',
    s.joining_date, s.is_verified ? 'Yes' : 'No',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `students_export_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}
