const pool   = require('../config/db')
const crypto = require('crypto')

// GET /api/dashboard?hostel_id=xxx
async function getDashboardStats(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.status(400).json({ error: 'hostel_id required' })

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0]
  const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().split('T')[0]

  try {
    const { rows: [{ totalStudents }] } = await pool.query(
      'SELECT COUNT(*) AS "totalStudents" FROM students WHERE hostel_id = $1', [hostelId]
    )
    const { rows: beds } = await pool.query('SELECT status FROM beds WHERE hostel_id = $1', [hostelId])
    const totalBeds    = beds.length
    const occupiedBeds = beds.filter(b => b.status === 'occupied').length

    const { rows: payments } = await pool.query(
      'SELECT amount FROM student_payments WHERE hostel_id = $1 AND created_at >= $2 AND created_at <= $3',
      [hostelId, monthStart + ' 00:00:00', monthEnd + ' 23:59:59']
    )
    const monthlyRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)

    const { rows: allFees } = await pool.query("SELECT due_amount, status FROM fees WHERE hostel_id = $1 AND status != 'paid'", [hostelId])
    const pendingFees = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.due_amount), 0)
    const overdueFees = allFees.filter(f => f.status === 'overdue').reduce((s, f) => s + Number(f.due_amount), 0)

    res.json({ totalStudents: Number(totalStudents), totalBeds, occupiedBeds, monthlyRevenue, pendingFees, overdueFees })
  } catch (err) {
    console.error('[getDashboardStats]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/dashboard/revenue?hostel_id=xxx
async function getRevenueByMonth(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.json([])
  try {
    const { rows: rows } = await pool.query(
      "SELECT TO_CHAR(created_at, 'Mon YY') AS name, SUM(amount) AS amount FROM student_payments WHERE hostel_id = $1 GROUP BY TO_CHAR(created_at, 'Mon YY'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at) ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)",
      [hostelId]
    )
    res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })))
  } catch (err) {
    console.error('[getRevenueByMonth]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/complaints?hostel_id=xxx
async function getComplaints(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.json([])
  try {
    // backend/schema.sql: students uses full_name
    const { rows: rows } = await pool.query(
      `SELECT c.*, s.full_name AS student_name, r.room_number
       FROM complaints c
       LEFT JOIN students s ON s.id = c.student_id
       LEFT JOIN rooms r ON r.id = s.room_id
       WHERE c.hostel_id = $1 ORDER BY c.created_at DESC`,
      [hostelId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getComplaints]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/complaints
async function addComplaint(req, res) {
  const { hostel_id, student_id, title, description, category, priority, status } = req.body
  if (!hostel_id || !title) return res.status(400).json({ error: 'hostel_id and title required' })
  try {
    const id = crypto.randomUUID()
    await pool.query(
      'INSERT INTO complaints (id, hostel_id, student_id, title, description, category, priority, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [id, hostel_id, student_id || null, title, description || null, category || null, priority || 'medium', status || 'open']
    )
    res.status(201).json({ id, success: true })
  } catch (err) {
    console.error('[addComplaint]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// PUT /api/complaints/:id
async function updateComplaint(req, res) {
  const { id } = req.params
  const { status, priority, message } = req.body
  try {
    await pool.query('UPDATE complaints SET status=$1, priority=$2 WHERE id=$3', [status, priority, id])

    // Query complaint details + student email for notification
    const { rows: details } = await pool.query(
      `SELECT c.title, c.category, s.email AS student_email, s.full_name AS student_name
       FROM complaints c
       JOIN students s ON s.id = c.student_id
       WHERE c.id = $1`,
      [id]
    )

    if (details.length > 0 && details[0].student_email) {
      const { sendComplaintUpdateEmail } = require('../utils/emailService')
      sendComplaintUpdateEmail(
        details[0].student_email,
        details[0].student_name,
        details[0].title,
        details[0].category || 'General',
        status,
        message || ''
      ).catch(mailErr => console.error('Failed to send complaint update email:', mailErr))
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[updateComplaint]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/announcements?hostel_id=xxx
async function getAnnouncements(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.json([])
  try {
    const { rows: rows } = await pool.query(
      'SELECT * FROM announcements WHERE hostel_id = $1 ORDER BY created_at DESC',
      [hostelId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getAnnouncements]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/announcements
async function addAnnouncement(req, res) {
  const { hostel_id, title, message } = req.body
  if (!hostel_id || !title || !message) return res.status(400).json({ error: 'hostel_id, title and message required' })
  try {
    const id = crypto.randomUUID()
    await pool.query(
      'INSERT INTO announcements (id, hostel_id, title, message) VALUES ($1,$2,$3,$4) RETURNING id',
      [id, hostel_id, title, message]
    )

    // Fetch all active students of this hostel to email them
    const { rows: students } = await pool.query(
      'SELECT email, full_name FROM students WHERE hostel_id = $1 AND is_active = TRUE AND email IS NOT NULL',
      [hostel_id]
    )

    // Send email announcement notifications asynchronously
    if (students.length > 0) {
      const { sendAnnouncementEmail } = require('../utils/emailService')
      for (const student of students) {
        sendAnnouncementEmail(student.email, student.full_name, title, message)
          .catch(mailErr => console.error(`Failed to send announcement to ${student.email}:`, mailErr))
      }
    }

    res.status(201).json({ id, success: true })
  } catch (err) {
    console.error('[addAnnouncement]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// DELETE /api/announcements/:id
async function deleteAnnouncement(req, res) {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('[deleteAnnouncement]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/attendance?hostel_id=xxx&date=yyyy-mm-dd
async function getAttendance(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  const date = req.query.date || new Date().toISOString().split('T')[0]
  if (!hostelId) return res.json([])
  try {
    // backend/schema.sql: students uses full_name; attendance uses date column
    const { rows: rows } = await pool.query(
      `SELECT s.id, s.full_name, r.room_number,
              a.status AS attendance_status
       FROM students s
       LEFT JOIN rooms r ON r.id = s.room_id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       WHERE s.hostel_id = $2
       ORDER BY s.full_name`,
      [date, hostelId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getAttendance]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/attendance
async function markAttendance(req, res) {
  const { hostel_id, student_id, date, status } = req.body
  if (!hostel_id || !student_id || !date || !status) {
    return res.status(400).json({ error: 'hostel_id, student_id, date and status required' })
  }
  try {
    // backend/schema.sql attendance has UNIQUE KEY unique_attendance (student_id, date)
    await pool.query(
      `INSERT INTO attendance (id, hostel_id, student_id, date, status) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status RETURNING id`,
      [crypto.randomUUID(), hostel_id, student_id, date, status]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[markAttendance]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/food-menu?hostel_id=xxx
async function getFoodMenu(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.json({ menu: null })
  try {
    const { rows: rows } = await pool.query('SELECT menu FROM food_menus WHERE hostel_id = $1', [hostelId])
    // menu is stored as JSON string or JSON object depending on MySQL version
    let menu = rows[0]?.menu || null
    if (menu && typeof menu === 'string') {
      try { menu = JSON.parse(menu) } catch(e) { /* leave as string */ }
    }
    res.json({ menu })
  } catch (err) {
    console.error('[getFoodMenu]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// PUT /api/food-menu
async function saveFoodMenu(req, res) {
  const { hostel_id, menu } = req.body
  if (!hostel_id) return res.status(400).json({ error: 'hostel_id required' })
  try {
    // food_menus has UNIQUE on hostel_id so upsert works
    await pool.query(
      'INSERT INTO food_menus (id, hostel_id, menu) VALUES ($1,$2,$3) ON CONFLICT (hostel_id) DO UPDATE SET menu = EXCLUDED.menu RETURNING id',
      [crypto.randomUUID(), hostel_id, JSON.stringify(menu)]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[saveFoodMenu]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/dashboard/occupancy?hostel_id=xxx
async function getOccupancyByMonth(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.json([])
  try {
    const { rows } = await pool.query(
      `WITH months AS (
         SELECT 
           TO_CHAR(d, 'Mon YY') AS name,
           DATE_TRUNC('month', d) + INTERVAL '1 month - 1 day' AS month_end,
           EXTRACT(YEAR FROM d) AS yr,
           EXTRACT(MONTH FROM d) AS mth
         FROM generate_series(
           CURRENT_DATE - INTERVAL '4 months', 
           CURRENT_DATE + INTERVAL '1 month', 
           INTERVAL '1 month'
         ) d
       )
       SELECT 
         m.name, 
         (SELECT COUNT(*) FROM students s WHERE s.hostel_id = $1 AND s.joining_date <= m.month_end AND s.is_active = TRUE) AS students_count,
         (SELECT COUNT(*) FROM beds b WHERE b.hostel_id = $1) AS total_beds
       FROM months m 
       ORDER BY m.yr, m.mth`,
      [hostelId]
    )
    
    // Map to occupancy percentage: { name: 'Jun 26', value: 35 }
    const occupancyData = rows.map(r => {
      const totalBeds = Number(r.total_beds)
      const studentsCount = Number(r.students_count)
      const value = totalBeds > 0 ? Math.round((studentsCount / totalBeds) * 100) : 0
      return { name: r.name, value }
    })
    
    res.json(occupancyData)
  } catch (err) {
    console.error('[getOccupancyByMonth]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/attendance/student/:studentId
async function getStudentAttendanceHistory(req, res) {
  const { studentId } = req.params
  try {
    if (req.user.role === 'student') {
      const { rows: selfRows } = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id])
      if (selfRows.length === 0 || selfRows[0].id !== studentId) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    const { rows } = await pool.query(
      'SELECT date, status FROM attendance WHERE student_id = $1 ORDER BY date DESC',
      [studentId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getStudentAttendanceHistory]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = {
  getDashboardStats, getRevenueByMonth, getOccupancyByMonth,
  getComplaints, addComplaint, updateComplaint,
  getAnnouncements, addAnnouncement, deleteAnnouncement,
  getAttendance, markAttendance, getStudentAttendanceHistory,
  getFoodMenu, saveFoodMenu
}