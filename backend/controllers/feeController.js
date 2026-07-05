const pool   = require('../config/db')
const crypto = require('crypto')

// GET /api/fees?hostel_id=xxx
async function getFees(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.status(400).json({ error: 'hostel_id required' })
  try {
    // backend/schema.sql: students uses full_name column
    const { rows: rows } = await pool.query(
      `SELECT f.*, s.full_name AS student_name, r.room_number
       FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN rooms r ON r.id = s.room_id
       WHERE f.hostel_id = $1
       ORDER BY f.created_at DESC`,
      [hostelId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getFees]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/fees
async function addFee(req, res) {
  const { hostel_id, student_id, amount, month, due_date } = req.body
  if (!hostel_id || !student_id || !amount || !month) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Authorization check
  if (req.user.role !== 'super_admin' && String(hostel_id) !== String(req.user.hostel_id)) {
    return res.status(403).json({ error: 'Access denied to this hostel' })
  }

  try {
    // Verify student belongs to this hostel
    const { rows: studentCheck } = await pool.query('SELECT hostel_id FROM students WHERE id = $1', [student_id])
    if (studentCheck.length === 0) {
      return res.status(404).json({ error: 'Student not found' })
    }
    if (String(studentCheck[0].hostel_id) !== String(hostel_id)) {
      return res.status(400).json({ error: 'Student does not belong to the specified hostel' })
    }

    const id = crypto.randomUUID()
    const result = await pool.query(
      `INSERT INTO fees (id, hostel_id, student_id, amount, due_amount, month, due_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (student_id, month) DO NOTHING
       RETURNING id`,
      [id, hostel_id, student_id, amount, amount, month, due_date || null, 'pending']
    )
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Fee record already exists for this student and month.' })
    }
    res.status(201).json({ id, success: true })
  } catch (err) {
    console.error('[addFee]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/fees/generate-bulk
async function generateBulkFees(req, res) {
  const { hostel_id, month, due_date } = req.body
  if (!hostel_id || !month) return res.status(400).json({ error: 'hostel_id and month required' })

  // Authorization check
  if (req.user.role !== 'super_admin' && String(hostel_id) !== String(req.user.hostel_id)) {
    return res.status(403).json({ error: 'Access denied to this hostel' })
  }

  const parsedMonth = new Date(month)
  const normMonth = new Date(Date.UTC(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1))
    .toISOString().split('T')[0]
  const nextMonth = new Date(Date.UTC(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1))
    .toISOString().split('T')[0]

  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    // backend/schema.sql: rooms has monthly_fee column
    const { rows: students } = await conn.query(
      'SELECT s.id, r.monthly_fee FROM students s JOIN rooms r ON r.id = s.room_id WHERE s.hostel_id = $1 AND s.room_id IS NOT NULL',
      [hostel_id]
    )
    const { rows: existing } = await conn.query(
      'SELECT student_id FROM fees WHERE hostel_id = $1 AND month >= $2 AND month < $3',
      [hostel_id, normMonth, nextMonth]
    )
    const existingIds = new Set(existing.map(e => e.student_id))

    let created = 0
    for (const s of students) {
      if (!existingIds.has(s.id) && Number(s.monthly_fee) > 0) {
        const insertRes = await conn.query(
          `INSERT INTO fees (id, hostel_id, student_id, amount, due_amount, month, due_date, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (student_id, month) DO NOTHING
           RETURNING id`,
          [crypto.randomUUID(), hostel_id, s.id, s.monthly_fee, s.monthly_fee, normMonth, due_date || null, 'pending']
        )
        if (insertRes.rows.length > 0) {
          created++
        }
      }
    }
    await conn.query('COMMIT')
    res.json({ created })
  } catch (err) {
    await conn.query('ROLLBACK')
    console.error('[generateBulkFees]', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    conn.release()
  }
}

// POST /api/fees/:id/payment
async function processPayment(req, res) {
  const { id } = req.params
  const { amount_paid, payment_method, paid_at } = req.body
  if (!amount_paid) return res.status(400).json({ error: 'amount_paid required' })

  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const { rows: feeRows } = await conn.query(
      `SELECT f.*, s.email AS student_email, s.full_name AS student_name
       FROM fees f
       JOIN students s ON s.id = f.student_id
       WHERE f.id = $1 FOR UPDATE`,
      [id]
    )
    const fee = feeRows[0]
    if (!fee) {
      await conn.query('ROLLBACK')
      return res.status(404).json({ error: 'Fee not found' })
    }

    // Validate permission
    if (req.user.role !== 'super_admin' && req.user.hostel_id !== String(fee.hostel_id)) {
        await conn.query('ROLLBACK')
        return res.status(403).json({ error: 'Access denied to this fee' })
    }

    const newPaidAmount = Number(fee.paid_amount) + Number(amount_paid)
    const newDueAmount  = Number(fee.amount) - newPaidAmount
    let newStatus = 'pending'
    if (newPaidAmount >= Number(fee.amount)) newStatus = 'paid'
    else if (newPaidAmount > 0) newStatus = 'partial'

    const receiptId = `REC-${Date.now()}`
    await conn.query(
      `UPDATE fees SET status=$1, paid_amount=$2, due_amount=$3, paid_at=$4, receipt_id=$5 WHERE id=$6`,
      [
        newStatus,
        newPaidAmount,
        Math.max(0, newDueAmount),
        newStatus === 'paid' ? (paid_at || new Date().toISOString()) : null,
        newStatus === 'paid' ? receiptId : null,
        id
      ]
    )

    // Insert payment record
    await conn.query(
      'INSERT INTO student_payments (id, hostel_id, fee_id, student_id, amount, payment_method, transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [crypto.randomUUID(), fee.hostel_id, id, fee.student_id, amount_paid, payment_method || 'cash', receiptId]
    )

    await conn.query('COMMIT')

    // Send email receipt asynchronously
    if (fee.student_email) {
      const monthLabel = fee.month
        ? new Date(fee.month).toLocaleString('default', { month: 'long', year: 'numeric' })
        : 'Unknown';
      const { sendPaymentReceiptEmail } = require('../utils/emailService')
      sendPaymentReceiptEmail(
        fee.student_email,
        fee.student_name,
        receiptId,
        amount_paid,
        monthLabel,
        payment_method || 'cash'
      ).catch(mailErr => console.error('Failed to send receipt email:', mailErr))
    }

    res.json({ success: true, receipt_id: receiptId, status: newStatus })
  } catch (err) {
    await conn.query('ROLLBACK')
    console.error('[processPayment]', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    conn.release()
  }
}

// POST /api/fees/mark-overdue
async function markOverdue(req, res) {
  const { hostel_id } = req.body
  if (!hostel_id) return res.status(400).json({ error: 'hostel_id required' })

  // Authorization check
  if (req.user.role !== 'super_admin' && String(hostel_id) !== String(req.user.hostel_id)) {
    return res.status(403).json({ error: 'Access denied to this hostel' })
  }

  const today = new Date().toISOString().split('T')[0]
  try {
    const { rows: result } = await pool.query(
      "UPDATE fees SET status='overdue' WHERE hostel_id=$1 AND status='pending' AND due_date < $2 AND due_date IS NOT NULL",
      [hostel_id, today]
    )
    res.json({ updated: result.affectedRows })
  } catch (err) {
    console.error('[markOverdue]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/fees/student/:studentId
async function getStudentFees(req, res) {
  const { studentId } = req.params
  if (!studentId) return res.json([])

  try {
    // Validate permission
    if (req.user.role === 'student') {
      const { rows: selfRows } = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id])
      if (selfRows.length === 0 || selfRows[0].id !== studentId) {
        return res.status(403).json({ error: 'Access denied to this student fee record' })
      }
    } else if (req.user.role !== 'super_admin') {
      const { rows: studentCheck } = await pool.query('SELECT hostel_id FROM students WHERE id = $1', [studentId])
      if (studentCheck.length === 0) {
        return res.status(404).json({ error: 'Student not found' })
      }
      if (String(studentCheck[0].hostel_id) !== String(req.user.hostel_id)) {
        return res.status(403).json({ error: 'Access denied: Student belongs to another hostel' })
      }
    }

    const { rows: rows } = await pool.query(
      'SELECT * FROM fees WHERE student_id = $1 ORDER BY month DESC',
      [studentId]
    )

    // Filter out future bills that are not within 5 days of their due date
    const now = new Date()
    const filtered = rows.filter(fee => {
      if (fee.status === 'paid') return true
      if (!fee.due_date) return true

      const dueDate = new Date(fee.due_date)
      const fiveDaysBefore = new Date(dueDate)
      fiveDaysBefore.setDate(dueDate.getDate() - 5)

      // Show if today is on or after fiveDaysBefore
      return now >= fiveDaysBefore
    })

    res.json(filtered)
  } catch (err) {
    console.error('[getStudentFees]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { getFees, addFee, generateBulkFees, processPayment, markOverdue, getStudentFees }