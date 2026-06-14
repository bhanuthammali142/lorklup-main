const pool   = require('../config/db')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

// GET /api/students?hostel_id=xxx
async function getStudents(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.status(400).json({ error: 'hostel_id required' })

  try {
    const { rows: rows } = await pool.query(
      `SELECT s.*,
              r.room_number, r.floor, r.type AS room_type, r.monthly_fee,
              b.bed_number,
              h.hostel_name
       FROM students s
       LEFT JOIN rooms r ON r.id = s.room_id
       LEFT JOIN beds  b ON b.id = s.bed_id
       LEFT JOIN hostels h ON h.id = s.hostel_id
       WHERE s.hostel_id = $1 AND s.is_active = TRUE
       ORDER BY s.created_at DESC`,
      [hostelId]
    )

    // Map rows to include nested rooms and beds for the frontend types
    const mappedRows = rows.map(row => ({
      ...row,
      rooms: row.room_id ? {
        room_number: row.room_number,
        floor: row.floor,
        type: row.room_type
      } : null,
      beds: row.bed_id ? {
        bed_number: row.bed_number
      } : null
    }))

    res.json(mappedRows)
  } catch (err) {
    console.error('[getStudents]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/students
async function addStudent(req, res) {
  const {
    hostel_id, full_name, email, phone, parent_phone,
    id_number, college_name, branch, joining_date,
    room_id, bed_id, advance_amount, monthly_payment_day
  } = req.body

  if (!full_name || !hostel_id || !room_id || !bed_id) return res.status(400).json({ error: 'full_name, hostel_id, room_id, and bed_id required' })

  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')

    // ── CAPACITY CHECK ──
    // In the refactored schema, billing_plans is dropped. We query subscriptions for status and plan_name,
    // and retrieve the max student limit from platform_settings (defaulting to 200).
    const { rows: [subscription] } = await conn.query(`
      SELECT plan_name, status 
      FROM subscriptions 
      WHERE hostel_id = $1 AND status IN ('active', 'trialing')
      ORDER BY created_at DESC LIMIT 1
    `, [hostel_id])
    
    let max_students = 200; // default fallback
    const { rows: settingsRows } = await conn.query(
      "SELECT value FROM platform_settings WHERE key = 'max_students'"
    ).catch(() => ({ rows: [] }));
    if (settingsRows.length > 0) {
      max_students = parseInt(settingsRows[0].value, 10) || 200;
    }

    const { rows: [{ student_count }] } = await conn.query(`
      SELECT COUNT(*) as student_count FROM students WHERE hostel_id = $1 AND is_active = TRUE
    `, [hostel_id])

    if (parseInt(student_count, 10) >= max_students) {
      await conn.query('ROLLBACK')
      conn.release()
      return res.status(403).json({ error: 'Hostel has reached maximum student capacity for the current billing plan. Please upgrade to add more students.' })
    }

    // ── CROSS-HOSTEL ADMISSION CHECK ──
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (phone && phone.trim()) {
      conditions.push(`phone = $${paramIdx++}`);
      values.push(phone.trim());
    }
    if (parent_phone && parent_phone.trim()) {
      conditions.push(`parent_phone = $${paramIdx++}`);
      values.push(parent_phone.trim());
    }
    if (email && email.trim()) {
      conditions.push(`email = $${paramIdx++}`);
      values.push(email.trim());
    }
    if (id_number && id_number.trim()) {
      conditions.push(`id_number = $${paramIdx++}`);
      values.push(id_number.trim());
    }

    if (conditions.length > 0) {
      const checkQuery = `
        SELECT id, hostel_id FROM students 
        WHERE (${conditions.join(' OR ')}) 
        AND is_active = TRUE
        LIMIT 1
      `;
      const { rows: activeStudents } = await conn.query(checkQuery, values);
      if (activeStudents.length > 0) {
         await conn.query('ROLLBACK');
         conn.release();
         return res.status(400).json({ 
           error: `Student details (email/phone/ID) already exist. The student must be deactivated (closed) in their current hostel before new admission.` 
         });
      }
    }

    // Create user account for student if email provided
    let userId = null
    let credentials = null
    if (email) {
      const { rows: existing } = await conn.query('SELECT id, role FROM users WHERE email = $1', [email])
      if (existing.length > 0) {
        if (existing[0].role !== 'student') {
          await conn.query('ROLLBACK')
          conn.release()
          return res.status(400).json({ error: 'This email is already registered to an administrator account.' })
        }
        userId = existing[0].id
        // Reset password for existing student login
        const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 8) + 'Ab@1'
        const hash = await bcrypt.hash(tempPassword, 12)
        await conn.query('UPDATE users SET password = $1, is_active = TRUE WHERE id = $2', [hash, userId])
        credentials = { email, password: tempPassword }
      } else {
        // Generate a readable secure temp password
        const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 8) + 'Ab@1'
        const hash = await bcrypt.hash(tempPassword, 12)

        // FIXED: Do NOT pass id — let MySQL AUTO_INCREMENT assign it
        const { rows: insertResult } = await conn.query(
          'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
          [email, hash, 'student']
        )
        userId = insertResult[0].id   // <-- use the generated INT id
        credentials = { email, password: tempPassword }
      }
    }

    const studentId = crypto.randomUUID()
    await conn.query(
      `INSERT INTO students
       (id, hostel_id, user_id, room_id, bed_id, full_name, email, phone, parent_phone,
        id_number, college_name, branch, joining_date, advance_amount, monthly_payment_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [
        studentId, hostel_id, userId, room_id || null, bed_id || null,
        full_name, email || null, phone || null, parent_phone || null,
        id_number || null, college_name || null, branch || null, joining_date || null,
        Number(advance_amount || 0), Number(monthly_payment_day || 5)
      ]
    )

    // Mark bed as occupied
    if (bed_id) {
      await conn.query("UPDATE beds SET status = 'occupied' WHERE id = $1", [bed_id])
    }

    // Auto-create current month fee if room assigned
    if (room_id) {
      const { rows: roomRows } = await conn.query('SELECT monthly_fee FROM rooms WHERE id = $1', [room_id])
      const fee = Number(roomRows[0]?.monthly_fee)
      if (fee > 0) {
        const now = new Date()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0]
        const dueDay = Number(monthly_payment_day || 5)
        const dueDate   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dueDay)).toISOString().split('T')[0]
        await conn.query(
          `INSERT INTO fees (id, hostel_id, student_id, amount, due_amount, month, due_date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (student_id, month) DO NOTHING
           RETURNING id`,
          [crypto.randomUUID(), hostel_id, studentId, fee, fee, monthStart, dueDate, 'pending']
        )
      }
    }

    await conn.query('COMMIT')
    conn.release()

    // Send welcome email asynchronously
    if (email && credentials) {
      const { sendWelcomeEmail } = require('../utils/emailService')
      sendWelcomeEmail(email, full_name, credentials.password)
        .catch(err => console.error('Failed to send welcome email:', err))
    }

    const { rows: rows } = await pool.query(
      `SELECT s.*,
              r.room_number, r.floor, r.type AS room_type, r.monthly_fee,
              b.bed_number,
              h.hostel_name
         FROM students s
         LEFT JOIN rooms r ON r.id = s.room_id
         LEFT JOIN beds  b ON b.id = s.bed_id
         LEFT JOIN hostels h ON h.id = s.hostel_id
        WHERE s.id = $1`,
      [studentId]
    )

    let student = rows[0] || null
    if (student) {
      student = {
        ...student,
        rooms: student.room_id ? {
          room_number: student.room_number,
          floor: student.floor,
          type: student.room_type
        } : null,
        beds: student.bed_id ? {
          bed_number: student.bed_number
        } : null
      }
    }

    res.status(201).json({ student, credentials })
  } catch (err) {
    await conn.query('ROLLBACK')
    conn.release()
    console.error('[addStudent]', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}

// PUT /api/students/:id
async function updateStudent(req, res) {
  const { id } = req.params
  const fields = req.body
  const allowed = [
    'full_name', 'email', 'phone', 'parent_phone', 'id_number',
    'college_name', 'branch', 'joining_date', 'room_id', 'bed_id', 'is_verified', 'is_active',
    'advance_amount', 'monthly_payment_day'
  ]
  const updates = Object.keys(fields).filter(k => allowed.includes(k))
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' })

  try {
    // Build SET clause with PostgreSQL numbered placeholders
    const setClause = updates.map((k, i) => `${k} = $${i + 1}`).join(', ')
    const vals = [...updates.map(k => fields[k]), id]
    // WHERE clause uses the next placeholder number
    const wherePlaceholder = `$${updates.length + 1}`
    
    const conn = await pool.connect()
    try {
      await conn.query('BEGIN')
      await conn.query(`UPDATE students SET ${setClause} WHERE id = ${wherePlaceholder}`, vals)
      
      // If deactivated, free up the bed
      if (fields.is_active === false || fields.is_active === 'false') {
        const { rows: studentRows } = await conn.query('SELECT bed_id FROM students WHERE id = $1', [id])
        if (studentRows[0]?.bed_id) {
          await conn.query("UPDATE beds SET status = 'available' WHERE id = $1", [studentRows[0].bed_id])
          await conn.query("UPDATE students SET bed_id = NULL, room_id = NULL WHERE id = $1", [id])
        }
      }
      
      await conn.query('COMMIT')
      res.json({ success: true })
    } catch (err) {
      await conn.query('ROLLBACK')
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('[updateStudent]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// DELETE /api/students/:id
async function deleteStudent(req, res) {
  const { id } = req.params
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const { rows: rows } = await conn.query('SELECT bed_id FROM students WHERE id = $1 FOR UPDATE', [id])
    if (rows[0]?.bed_id) {
      await conn.query("UPDATE beds SET status = 'available' WHERE id = $1", [rows[0].bed_id])
    }
    // Soft delete: set is_active to false and unassign room/bed
    await conn.query('UPDATE students SET is_active = FALSE, room_id = NULL, bed_id = NULL WHERE id = $1', [id])
    await conn.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await conn.query('ROLLBACK')
    console.error('[deleteStudent]', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    conn.release()
  }
}

async function bulkAddStudents(req, res) {
  const { students } = req.body
  const hostelId = req.body.hostel_id || req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.status(400).json({ error: 'hostel_id is required' })
  if (!students || !Array.isArray(students)) return res.status(400).json({ error: 'students array is required' })

  const conn = await pool.connect()
  const results = []
  try {
    await conn.query('BEGIN')

    for (const student of students) {
      const {
        full_name, email, phone, parent_phone,
        id_number, college_name, branch, joining_date,
        room_number, bed_number
      } = student

      if (!full_name) {
        throw new Error('Student name is required for all records')
      }

      // ── CROSS-HOSTEL ADMISSION CHECK FOR BULK ──
      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (phone && phone.trim()) {
        conditions.push(`phone = $${paramIdx++}`);
        values.push(phone.trim());
      }
      if (parent_phone && parent_phone.trim()) {
        conditions.push(`parent_phone = $${paramIdx++}`);
        values.push(parent_phone.trim());
      }
      if (email && email.trim()) {
        conditions.push(`email = $${paramIdx++}`);
        values.push(email.trim());
      }
      if (id_number && id_number.trim()) {
        conditions.push(`id_number = $${paramIdx++}`);
        values.push(id_number.trim());
      }

      if (conditions.length > 0) {
        const checkQuery = `
          SELECT id FROM students 
          WHERE (${conditions.join(' OR ')}) 
          AND is_active = TRUE
          LIMIT 1
        `;
        const { rows: activeStudents } = await conn.query(checkQuery, values);
        if (activeStudents.length > 0) {
           throw new Error(`Student ${full_name} details already exist. The student must be deactivated (closed) in their current hostel before new admission.`);
        }
      }

      // 1. Find or create Room
      let roomId = null
      const cleanRoomNo = room_number ? String(room_number).trim() : ''
      if (cleanRoomNo) {
        const { rows: roomRows } = await conn.query(
          'SELECT id FROM rooms WHERE hostel_id = $1 AND room_number = $2',
          [hostelId, cleanRoomNo]
        )
        if (roomRows.length > 0) {
          roomId = roomRows[0].id
        } else {
          roomId = crypto.randomUUID()
          await conn.query(
            `INSERT INTO rooms (id, hostel_id, room_number, floor, type, capacity, monthly_fee)
             VALUES ($1, $2, $3, 'Ground Floor', 'Non-AC', 2, 5000)`,
            [roomId, hostelId, cleanRoomNo]
          )
        }
      }

      // 2. Find or create Bed
      let bedId = null
      const cleanBedNo = bed_number ? String(bed_number).trim() : 'B1'
      if (roomId) {
        const { rows: bedRows } = await conn.query(
          'SELECT id FROM beds WHERE room_id = $1 AND bed_number = $2',
          [roomId, cleanBedNo]
        )
        if (bedRows.length > 0) {
          bedId = bedRows[0].id
        } else {
          bedId = crypto.randomUUID()
          await conn.query(
            'INSERT INTO beds (id, hostel_id, room_id, bed_number, status) VALUES ($1, $2, $3, $4, $5)',
            [bedId, hostelId, roomId, cleanBedNo, 'available']
          )
        }
      }

      // 3. Create user login if email provided
      let userId = null
      if (email) {
        const { rows: existing } = await conn.query('SELECT id, role FROM users WHERE email = $1', [email])
        if (existing.length > 0) {
          if (existing[0].role !== 'student') {
            throw new Error(`Email ${email} is already registered to an administrator account.`)
          }
          userId = existing[0].id
          const tempPassword = student.password || 'Student@123'
          const hash = await bcrypt.hash(tempPassword, 12)
          await conn.query('UPDATE users SET password = $1, is_active = TRUE WHERE id = $2', [hash, userId])
        } else {
          const tempPassword = student.password || 'Student@123'
          const hash = await bcrypt.hash(tempPassword, 12)
          const { rows: userResult } = await conn.query(
            'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
            [email, hash, 'student']
          )
          userId = userResult[0].id
        }
      }

      // 4. Create Student
      const studentId = crypto.randomUUID()
      const finalJoiningDate = joining_date ? new Date(joining_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      await conn.query(
        `INSERT INTO students
         (id, hostel_id, user_id, room_id, bed_id, full_name, email, phone, parent_phone,
          id_number, college_name, branch, joining_date, is_verified, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          studentId, hostelId, userId, roomId, bedId,
          full_name, email || null, phone || null, parent_phone || null,
          id_number || null, college_name || null, branch || null, finalJoiningDate,
          true, true
        ]
      )

      // 5. Mark Bed occupied
      if (bedId) {
        await conn.query("UPDATE beds SET status = 'occupied' WHERE id = $1", [bedId])
      }

      // 6. Auto-generate current month fee record
      if (roomId) {
        const { rows: roomRows } = await conn.query('SELECT monthly_fee FROM rooms WHERE id = $1', [roomId])
        const fee = Number(roomRows[0]?.monthly_fee) || 5000
        if (fee > 0) {
          const now = new Date()
          const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0]
          const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 5)).toISOString().split('T')[0]
          await conn.query(
            `INSERT INTO fees (id, hostel_id, student_id, amount, due_amount, month, due_date, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (student_id, month) DO NOTHING`,
            [crypto.randomUUID(), hostelId, studentId, fee, fee, monthStart, dueDate, 'pending']
          )
        }
      }

      results.push({ full_name, email, room_number: cleanRoomNo, bed_number: cleanBedNo })
    }

    await conn.query('COMMIT')
    conn.release()

    // Send welcome emails asynchronously
    const { sendWelcomeEmail } = require('../utils/emailService')
    for (const s of students) {
      if (s.email) {
        sendWelcomeEmail(s.email, s.full_name, 'Student@123')
          .catch(err => console.error('Failed to send bulk welcome email:', err))
      }
    }

    res.json({ success: true, message: `Successfully bulk imported ${students.length} students`, data: results })
  } catch (error) {
    await conn.query('ROLLBACK')
    conn.release()
    console.error('bulkAddStudents error:', error)
    res.status(500).json({ error: error.message || 'Server error' })
  }
}

// GET /api/students/profile/me
async function getStudentSelfProfile(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can access this endpoint' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
              r.room_number, r.floor, r.type AS room_type, r.monthly_fee,
              b.bed_number,
              h.hostel_name
       FROM students s
       LEFT JOIN rooms r ON r.id = s.room_id
       LEFT JOIN beds  b ON b.id = s.bed_id
       LEFT JOIN hostels h ON h.id = s.hostel_id
       WHERE s.user_id = $1 AND s.is_active = TRUE
       LIMIT 1`,
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' })
    }

    const row = rows[0]
    const mappedStudent = {
      ...row,
      rooms: row.room_id ? {
        room_number: row.room_number,
        floor: row.floor,
        type: row.room_type
      } : null,
      beds: row.bed_id ? {
        bed_number: row.bed_number
      } : null
    }

    res.json(mappedStudent)
  } catch (err) {
    console.error('[getStudentSelfProfile]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { getStudents, addStudent, updateStudent, deleteStudent, bulkAddStudents, getStudentSelfProfile }