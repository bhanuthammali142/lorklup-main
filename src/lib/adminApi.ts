/**
 * adminApi.ts — MySQL backend version
 * FIXED: Field names match backend expectations
 */
import { apiHostels } from './api-client'

export async function createHostelWithOwner(payload: {
  ownerEmail: string
  ownerName: string
  ownerPhone?: string
  ownerPassword?: string
  hostelName: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  floors?: any[]
  menu?: any
  profilePhoto?: string
}) {
  const finalPassword = payload.ownerPassword || generateTempPassword()
  return apiHostels.createWithOwner({
    owner_name:     payload.ownerName,
    owner_email:    payload.ownerEmail,
    owner_phone:    payload.ownerPhone || '',
    owner_password: finalPassword,
    hostel_name:    payload.hostelName,
    hostel_code:    generateHostelCode(payload.hostelName),
    address_line1:  payload.address || '',
    city:           extractCity(payload.address || ''),
    state:          extractState(payload.address || ''),
    pincode:        extractPincode(payload.address || ''),
    contact_email:  payload.contactEmail || payload.ownerEmail,
    contact_phone:  payload.contactPhone || payload.ownerPhone || '',
    floors:         payload.floors || [],
    menu:           payload.menu || {},
    profile_photo:  payload.profilePhoto || ''
  }).then((res: any) => {
    // Map response to what UI expects
    return {
      credentials: res.data?.credentials || res.credentials || { email: payload.ownerEmail, password: finalPassword },
      summary: res.message || res.summary || 'Hostel created successfully'
    }
  })
}

// Helper function to generate a temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Helper function to generate hostel code from name
function generateHostelCode(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8) + Date.now().toString().slice(-4)
}

// Helper to extract city from address (simple logic)
function extractCity(address?: string): string {
  if (!address) return 'Unknown'
  const parts = address.split(',')
  // Try to get the second last part or third part as city
  if (parts.length >= 2) {
    return parts[parts.length - 2]?.trim() || 'Unknown'
  }
  return parts[0]?.trim().substring(0, 50) || 'Unknown'
}

// Helper to extract state (simplified)
function extractState(address?: string): string {
  if (!address) return 'Unknown'
  const parts = address.split(',')
  if (parts.length >= 1) {
    const lastPart = parts[parts.length - 1]?.trim() || ''
    // Check if last part looks like a state (contains common state names)
    const commonStates = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'UP', 'Telangana', 'West Bengal']
    for (const state of commonStates) {
      if (lastPart.includes(state)) return state
    }
    return lastPart.split(' ').pop() || 'Unknown'
  }
  return 'Unknown'
}

// Helper to extract pincode
function extractPincode(address?: string): string {
  if (!address) return '000000'
  const match = address.match(/\b\d{6}\b/)
  return match?.[0] ?? '000000'
}

export async function createStudentAuthAccount() {
  // With MySQL backend, student account creation is handled inside addStudent
  return { user_id: null, credentials: null }
}

export async function callAdminFunction(action: string, payload: any = {}) {
  switch (action) {
    case 'create_hostel':
      return apiHostels.createWithOwner(payload)
    default:
      throw new Error(`Unknown admin action: ${action}`)
  }
}