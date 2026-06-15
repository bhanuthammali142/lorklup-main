const db     = require('../config/db')
const bcrypt = require('bcryptjs')
const { saveBase64Image } = require('../utils/fileStorage')

const getHostels = async (req, res) => {
    try {
        let hostels
        if (req.user.role === 'super_admin') {
            const { rows } = await db.query(`
                SELECT h.*,
                       s.plan_price AS subscription_price,
                       s.billing_cycle AS subscription_billing_cycle,
                       s.status AS subscription_status,
                       s.next_billing_date AS subscription_next_billing_date
                FROM hostels h
                LEFT JOIN subscriptions s ON s.hostel_id = h.id
                ORDER BY h.created_at DESC
            `)
            hostels = rows
        } else {
            // admin: return only the hostel linked to this user
            const { rows } = await db.query(
                `SELECT h.*,
                        s.plan_price AS subscription_price,
                        s.billing_cycle AS subscription_billing_cycle,
                        s.status AS subscription_status,
                        s.next_billing_date AS subscription_next_billing_date
                   FROM hostels h
                   JOIN hostel_owners ho ON ho.id = h.owner_id
                   LEFT JOIN subscriptions s ON s.hostel_id = h.id
                  WHERE ho.user_id = $1
                  ORDER BY h.created_at DESC`,
                [req.user.id]
            )
            hostels = rows
        }
        res.json({ success: true, data: hostels })
    } catch (error) {
        console.error('[getHostels]', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

// POST /api/hostels
const createHostel = async (req, res) => {
    try {
        const { owner_id, hostel_name, hostel_code, address_line1, city, state, pincode } = req.body

        const { rows: result } = await db.query(
            `INSERT INTO hostels (owner_id, hostel_name, hostel_code, address_line1, city, state, pincode)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [owner_id, hostel_name, hostel_code, address_line1, city, state, pincode]
        )

        const hostelId = result[0].id;
        
        // Auto-create subscription record
        const crypto = require('crypto');
        const subId = crypto.randomUUID();
        const startDate = new Date();
        const nextBillingDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days trial

        await db.query(`
            INSERT INTO subscriptions (
                id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
                start_date, end_date, next_billing_date, status, billing_cycle
            ) VALUES ($1, $2, 'HostelOS Professional', 999.00, 18.00, 179.82, 1178.82, $3, $4, $4, 'trialing', 'monthly')
        `, [subId, hostelId, startDate, nextBillingDate]);

        res.json({ success: true, message: 'Hostel created', data: { id: hostelId } })
    } catch (error) {
        console.error('[createHostel]', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

// PUT /api/hostels/:id
const updateHostel = async (req, res) => {
    try {
        const { id } = req.params
        const updates = req.body

        // Allowed fields for update to prevent SQL injection
        const allowedFields = [
            'hostel_name', 'address_line1', 'city', 'state', 'pincode',
            'phone', 'email', 'total_floors', 'total_rooms', 'total_beds', 'is_active'
        ]

        // Filter only allowed fields
        const validUpdates = Object.keys(updates).filter(k => allowedFields.includes(k))
        if (validUpdates.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' })
        }

        // Build SET clause with PostgreSQL numbered placeholders
        const setClause = validUpdates.map((k, i) => `${k} = $${i + 1}`).join(', ')
        const values = validUpdates.map(k => updates[k])
        values.push(id) // Add id for WHERE clause

        await db.query(`UPDATE hostels SET ${setClause} WHERE id = $${validUpdates.length + 1}`, values)
        res.json({ success: true, message: 'Hostel updated' })
    } catch (error) {
        console.error('[updateHostel]', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

// POST /api/hostels/create-with-owner
// FIXED: uses getConnection() for proper transactions; hashes owner password
const createHostelWithOwner = async (req, res) => {
    const {
        owner_name, owner_email, owner_phone, owner_password,
        hostel_name, hostel_code, address_line1,
        city, state, pincode,
        contact_email, contact_phone,
        floors, menu, profile_photo
    } = req.body

    if (!owner_name || !owner_email || !owner_password || !hostel_name || !hostel_code || !address_line1 || !profile_photo) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: owner_name, owner_email, owner_password, hostel_name, hostel_code, address_line1, and profile_photo'
        })
    }

    // FIXED: acquire a single connection so START/COMMIT/ROLLBACK stay on the same connection
    const conn = await db.connect()
    try {
        await conn.query('BEGIN')

        // Check if owner email already exists
        const { rows: existing } = await conn.query('SELECT id FROM users WHERE email = $1', [owner_email])
        if (existing.length > 0) {
            await conn.query('ROLLBACK')
            conn.release()
            return res.status(400).json({ success: false, error: 'An account with this email already exists' })
        }

        // FIXED: hash owner password before storing
        const hashedPassword = await bcrypt.hash(owner_password, 12)

        // 1. Create user for owner (no manual id — let AUTO_INCREMENT assign)
        const { rows: userResult } = await conn.query(
            'INSERT INTO users (email, password, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
            [owner_email, hashedPassword, 'admin', true]
        )
        console.log('✅ User created:', userResult[0].id)

        // 2. Create hostel_owner record
        const { rows: ownerResult } = await conn.query(
            'INSERT INTO hostel_owners (user_id, owner_name, owner_phone, owner_email) VALUES ($1, $2, $3, $4) RETURNING id',
            [userResult[0].id, owner_name, owner_phone || '', owner_email]
        )
        const ownerId = ownerResult[0].id
        console.log('✅ Owner created:', ownerId)

        // Save profile photo
        const photoUrl = saveBase64Image(profile_photo, 'owners', `${ownerId}_profile.jpg`)
        await conn.query(
            'UPDATE hostel_owners SET profile_photo_url = $1, profile_photo_uploaded_at = NOW() WHERE id = $2',
            [photoUrl, ownerId]
        )
        console.log('✅ Owner profile photo saved:', photoUrl)

        // 3. Create hostel
        const totalRooms = floors ? floors.reduce((t, f) => t + (f.rooms?.length || 0), 0) : 0
        const totalBeds  = floors ? floors.reduce((t, f) =>
            t + (f.rooms?.reduce((s, r) => s + (r.beds || 0), 0) || 0), 0) : 0

        const { rows: hostelResult } = await conn.query(
            `INSERT INTO hostels
               (owner_id, hostel_name, hostel_code, address_line1, city, state, pincode,
                phone, email, total_floors, total_rooms, total_beds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
            [
                ownerResult[0].id, hostel_name, hostel_code, address_line1,
                city  || 'Unknown', state || 'Unknown', pincode || '000000',
                contact_phone || owner_phone || '', contact_email || owner_email,
                floors ? floors.length : 0, totalRooms, totalBeds
            ]
        )
        console.log('✅ Hostel created:', hostelResult[0].id)

        // 4. Create floors / rooms / beds
        const crypto = require('crypto')
        if (floors && floors.length > 0) {
            for (const floor of floors) {
                if (floor.rooms && floor.rooms.length > 0) {
                    for (const room of floor.rooms) {
                        const roomId = crypto.randomUUID()
                        await conn.query(
                            `INSERT INTO rooms (id, hostel_id, room_number, floor, type, capacity, monthly_fee)
                             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                            [
                                roomId,
                                hostelResult[0].id,
                                room.roomNumber || `R${room.number || 1}`,
                                floor.floorName || floor.floor_name || `Floor ${floor.floor_number || 1}`,
                                room.type || 'Non-AC',
                                room.beds || 1,
                                room.monthlyFee || room.monthly_fee || 5000
                            ]
                        )

                        const bedCount = Number(room.beds) || 1
                        for (let i = 1; i <= bedCount; i++) {
                            await conn.query(
                                'INSERT INTO beds (id, hostel_id, room_id, bed_number, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                                [crypto.randomUUID(), hostelResult[0].id, roomId, `B${i}`, 'available']
                            )
                        }
                    }
                }
            }
        }

        // Auto-create subscription record
        const subId = crypto.randomUUID()
        const startDate = new Date()
        const nextBillingDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days trial

        await conn.query(`
            INSERT INTO subscriptions (
                id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
                start_date, end_date, next_billing_date, status, billing_cycle
            ) VALUES ($1, $2, 'HostelOS Professional', 999.00, 18.00, 179.82, 1178.82, $3, $4, $4, 'trialing', 'monthly')
        `, [subId, hostelResult[0].id, startDate, nextBillingDate])

        await conn.query('COMMIT')
        conn.release()

        res.json({
            success: true,
            message: `Hostel "${hostel_name}" created. Owner: ${owner_name}`,
            data: {
                owner_id: ownerResult[0].id,
                hostel_id: hostelResult[0].id,
                // Return plain password so super admin can share credentials
                credentials: { email: owner_email, password: owner_password }
            }
        })

    } catch (error) {
        await conn.query('ROLLBACK')
        conn.release()
        console.error('❌ createHostelWithOwner error:', error)
        res.status(500).json({ success: false, error: error.message })
    }
}

// POST /api/hostels/onboard
const onboardAdmin = async (req, res) => {
    const { hostel_name, room_count, default_fee } = req.body
    if (!hostel_name || !room_count) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const conn = await db.connect()
    try {
        await conn.query('BEGIN')

        // Get owner_id
        const { rows: ownerRows } = await conn.query('SELECT id FROM hostel_owners WHERE user_id = $1', [req.user.id])
        if (ownerRows.length === 0) {
            await conn.query('ROLLBACK')
            conn.release()
            return res.status(400).json({ error: 'Hostel owner not found' })
        }
        const ownerId = ownerRows[0].id

        // Generate hostel code
        const hostelCode = 'HSTL' + Math.floor(1000 + Math.random() * 9000)

        // Insert hostel
        const { rows: hostelResult } = await conn.query(
            `INSERT INTO hostels (owner_id, hostel_name, hostel_code, address_line1, total_rooms, total_beds)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [ownerId, hostel_name, hostelCode, 'Update Address', room_count, room_count * 2]
        )

        const hostelId = hostelResult[0].id
        const crypto = require('crypto')

        // Insert rooms and beds
        for (let i = 1; i <= room_count; i++) {
            const roomId = crypto.randomUUID()
            const roomNumber = 'R' + i
            await conn.query(
                `INSERT INTO rooms (id, hostel_id, room_number, floor, type, capacity, monthly_fee)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [roomId, hostelId, roomNumber, 'Ground Floor', 'Non-AC', 2, default_fee || 5000]
            )

            // Insert 2 beds per room
            for (let j = 1; j <= 2; j++) {
                const bedNumber = 'B' + j
                await conn.query(
                    'INSERT INTO beds (id, hostel_id, room_id, bed_number, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [crypto.randomUUID(), hostelId, roomId, bedNumber, 'available']
                )
            }
        }
        // Auto-create subscription record
        const subId = crypto.randomUUID()
        const startDate = new Date()
        const nextBillingDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days trial

        await conn.query(`
            INSERT INTO subscriptions (
                id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
                start_date, end_date, next_billing_date, status, billing_cycle
            ) VALUES ($1, $2, 'HostelOS Professional', 999.00, 18.00, 179.82, 1178.82, $3, $4, $4, 'trialing', 'monthly')
        `, [subId, hostelId, startDate, nextBillingDate])

        await conn.query('COMMIT')
        conn.release()

        res.json({ success: true, message: 'Onboarding complete', hostel_id: hostelId })
    } catch (error) {
        await conn.query('ROLLBACK')
        conn.release()
        console.error('onboardAdmin error:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

const bulkCreateHostels = async (req, res) => {
    const { hostels } = req.body
    if (!hostels || !Array.isArray(hostels)) {
        return res.status(400).json({ error: 'hostels array is required' })
    }

    const conn = await db.connect()
    const results = []
    const crypto = require('crypto')

    try {
        await conn.query('BEGIN')

        for (const hostel of hostels) {
            const {
                owner_name, owner_email, owner_phone, owner_password,
                hostel_name, hostel_code, address_line1,
                city, state, pincode,
                contact_email, contact_phone,
                floors_count, rooms_per_floor, beds_per_room
            } = hostel

            if (!owner_name || !owner_email || !hostel_name) {
                throw new Error(`Missing owner_name, owner_email, or hostel_name for "${hostel_name || 'unknown'}"`)
            }

            // Check if email already exists
            const { rows: existing } = await conn.query('SELECT id FROM users WHERE email = $1', [owner_email])
            if (existing.length > 0) {
                throw new Error(`Owner email "${owner_email}" already exists in the system`)
            }

            const finalPassword = owner_password || 'Admin@123'
            const hashedPassword = await bcrypt.hash(finalPassword, 12)

            // 1. Create user
            const { rows: userResult } = await conn.query(
                'INSERT INTO users (email, password, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
                [owner_email, hashedPassword, 'admin', true]
            )

            // 2. Create owner
            const { rows: ownerResult } = await conn.query(
                'INSERT INTO hostel_owners (user_id, owner_name, owner_phone, owner_email) VALUES ($1, $2, $3, $4) RETURNING id',
                [userResult[0].id, owner_name, owner_phone || '', owner_email]
            )

            // 3. Create hostel
            const finalHostelCode = hostel_code || ('HSTL' + Math.floor(1000 + Math.random() * 9000))
            const numFloors = Number(floors_count) || 1
            const numRoomsPerFloor = Number(rooms_per_floor) || 5
            const numBedsPerRoom = Number(beds_per_room) || 2
            const totalRooms = numFloors * numRoomsPerFloor
            const totalBeds = totalRooms * numBedsPerRoom

            const { rows: hostelResult } = await conn.query(
                `INSERT INTO hostels
                   (owner_id, hostel_name, hostel_code, address_line1, city, state, pincode,
                    phone, email, total_floors, total_rooms, total_beds)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [
                    ownerResult[0].id, hostel_name, finalHostelCode, address_line1 || 'Update Address',
                    city || 'Unknown', state || 'Unknown', pincode || '000000',
                    contact_phone || owner_phone || '', contact_email || owner_email,
                    numFloors, totalRooms, totalBeds
                ]
            )

            const hostelId = hostelResult[0].id

            // 4. Provision rooms/beds
            for (let f = 1; f <= numFloors; f++) {
                const floorName = `Floor ${f}`
                for (let r = 1; r <= numRoomsPerFloor; r++) {
                    const roomId = crypto.randomUUID()
                    const roomNumber = `${f}0${r}`
                    await conn.query(
                        `INSERT INTO rooms (id, hostel_id, room_number, floor, type, capacity, monthly_fee)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [roomId, hostelId, roomNumber, floorName, 'Non-AC', numBedsPerRoom, 5000]
                    )

                    for (let b = 1; b <= numBedsPerRoom; b++) {
                        await conn.query(
                            'INSERT INTO beds (id, hostel_id, room_id, bed_number, status) VALUES ($1, $2, $3, $4, $5)',
                            [crypto.randomUUID(), hostelId, roomId, `B${b}`, 'available']
                        )
                    }
                }
            }

            // Auto-create subscription record
            const subId = crypto.randomUUID()
            const startDate = new Date()
            const nextBillingDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days trial

            await conn.query(`
                INSERT INTO subscriptions (
                    id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
                    start_date, end_date, next_billing_date, status, billing_cycle
                ) VALUES ($1, $2, 'HostelOS Professional', 999.00, 18.00, 179.82, 1178.82, $3, $4, $4, 'trialing', 'monthly')
            `, [subId, hostelId, startDate, nextBillingDate])

            results.push({
                hostel_name,
                owner_email,
                credentials: { email: owner_email, password: finalPassword }
            })
        }

        await conn.query('COMMIT')
        conn.release()
        res.json({ success: true, message: `Successfully bulk created ${hostels.length} hostels`, data: results })
    } catch (error) {
        await conn.query('ROLLBACK')
        conn.release()
        console.error('bulkCreateHostels error:', error)
        res.status(500).json({ error: error.message || 'Server error' })
    }
}

module.exports = { getHostels, createHostel, updateHostel, createHostelWithOwner, onboardAdmin, bulkCreateHostels }