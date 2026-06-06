const pool   = require('../config/db')
const crypto = require('crypto')

// GET /api/rooms?hostel_id=xxx
async function getRooms(req, res) {
  const hostelId = req.query.hostel_id || req.user.hostel_id
  if (!hostelId) return res.status(400).json({ error: 'hostel_id required' })
  try {
    const { rows: rows } = await pool.query(
      `SELECT r.*, 
              COUNT(b.id) AS total_beds,
              SUM(CASE WHEN b.status='occupied' THEN 1 ELSE 0 END) AS occupied_beds,
              COALESCE(json_agg(json_build_object('id',b.id,'bed_number',b.bed_number,'status',b.status)) FILTER (WHERE b.id IS NOT NULL), '[]'::json) AS beds
       FROM rooms r LEFT JOIN beds b ON b.room_id = r.id
       WHERE r.hostel_id = $1 GROUP BY r.id ORDER BY r.room_number`,
      [hostelId]
    )
    res.json(rows)
  } catch (err) {
    console.error('[getRooms]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// POST /api/rooms
async function addRoom(req, res) {
  const { hostel_id, room_number, floor, type, capacity, monthly_fee } = req.body
  if (!hostel_id || !room_number) return res.status(400).json({ error: 'hostel_id and room_number required' })
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    const roomId = crypto.randomUUID()
    await conn.query(
      'INSERT INTO rooms (id, hostel_id, room_number, floor, type, capacity, monthly_fee) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [roomId, hostel_id, room_number, floor || 'Ground Floor', type || 'Non-AC', capacity || 3, monthly_fee || 0]
    )
    // auto-create beds
    const n = Number(capacity) || 3
    const bedInserts = Array.from({ length: n }, (_, i) =>
      [crypto.randomUUID(), hostel_id, roomId, `B${i + 1}`, 'available']
    )
    for (const b of bedInserts) {
      await conn.query('INSERT INTO beds (id, hostel_id, room_id, bed_number, status) VALUES ($1,$2,$3,$4,$5) RETURNING id', b)
    }
    await conn.query('COMMIT')
    
    const { rows: rows } = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId])
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.query('ROLLBACK')
    console.error('[addRoom]', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    conn.release()
  }
}

// PUT /api/rooms/:id
async function updateRoom(req, res) {
  const { id } = req.params
  const { room_number, floor, type, capacity, monthly_fee } = req.body
  try {
    await pool.query(
      'UPDATE rooms SET room_number=$1, floor=$2, type=$3, capacity=$4, monthly_fee=$5 WHERE id=$6',
      [room_number, floor, type, capacity, monthly_fee, id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[updateRoom]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

// DELETE /api/rooms/:id
async function deleteRoom(req, res) {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM rooms WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('[deleteRoom]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { getRooms, addRoom, updateRoom, deleteRoom }
