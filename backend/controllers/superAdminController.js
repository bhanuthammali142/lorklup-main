const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────
// GET /api/super-admin/dashboard
// ─────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const { rows: [{ total_hostels }] } = await db.query('SELECT COUNT(*) AS total_hostels FROM hostels');
        const { rows: [{ active_hostels }] } = await db.query('SELECT COUNT(*) AS active_hostels FROM hostels WHERE is_active = TRUE');
        const { rows: [{ total_students }] } = await db.query('SELECT COUNT(*) AS total_students FROM students WHERE is_active = TRUE');
        const { rows: [{ total_users }] } = await db.query('SELECT COUNT(*) AS total_users FROM users');
        const { rows: [{ total_revenue }] } = await db.query("SELECT COALESCE(SUM(amount),0) AS total_revenue FROM payments");
        const { rows: [{ pending_fees }] } = await db.query("SELECT COALESCE(SUM(due_amount),0) AS pending_fees FROM fees WHERE status IN ('pending','overdue','partial')");
        const { rows: [{ open_complaints }] } = await db.query("SELECT COUNT(*) AS open_complaints FROM complaints WHERE status = 'open'");
        const { rows: [{ total_rooms }] } = await db.query('SELECT COUNT(*) AS total_rooms FROM rooms WHERE is_active = TRUE');

        // Monthly revenue for last 6 months
        const { rows: monthlyRevenue } = await db.query(`
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') AS month,
                SUM(amount) AS revenue
            FROM payments
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month ASC
        `);

        // Hostel occupancy
        const { rows: occupancy } = await db.query(`
            SELECT
                h.hostel_name,
                h.total_beds,
                COUNT(s.id) AS occupied
            FROM hostels h
            LEFT JOIN students s ON s.hostel_id = h.id AND s.is_active = TRUE
            GROUP BY h.id
            ORDER BY h.created_at DESC
            LIMIT 6
        `);

        // Recent activity
        const { rows: recentActivity } = await db.query(`
            SELECT al.*, u.email, u.role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    total_hostels,
                    active_hostels,
                    total_students,
                    total_users,
                    total_revenue: Number(total_revenue),
                    pending_fees: Number(pending_fees),
                    open_complaints,
                    total_rooms
                },
                monthlyRevenue,
                occupancy,
                recentActivity
            }
        });
    } catch (error) {
        console.error('[getDashboardStats]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/users
// ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = `
            SELECT u.id, u.email, u.role, u.is_active, u.last_login, u.created_at,
                   COALESCE(sa.name, ho.owner_name) AS name,
                   ho.owner_phone AS phone,
                   STRING_AGG(h.hostel_name, ', ') AS hostel_name
            FROM users u
            LEFT JOIN super_admins sa ON sa.user_id = u.id
            LEFT JOIN hostel_owners ho ON ho.user_id = u.id
            LEFT JOIN hostels h ON h.owner_id = ho.id
            WHERE u.role IN ('super_admin', 'admin')
        `;
        const params = [];

        if (role) { query += ` AND u.role = $${params.length + 1}`; params.push(role); }
        if (status === 'active') { query += ' AND u.is_active = TRUE'; }
        if (status === 'inactive') { query += ' AND u.is_active = FALSE'; }
        if (search) {
            query += ` AND (u.email ILIKE $${params.length + 1} OR COALESCE(sa.name, ho.owner_name) ILIKE $${params.length + 2})`;
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' GROUP BY u.id, sa.name, ho.owner_name, ho.owner_phone';
        query += ' ORDER BY u.created_at DESC';

        const { rows: users } = await db.query(query, params);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('[getAllUsers]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/super-admin/users/:id/status
// ─────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active ? true : false, id]);
        const action = is_active ? 'USER_ACTIVATED' : 'USER_SUSPENDED';
        res.json({ success: true, message: `User ${is_active ? 'activated' : 'suspended'}` });
    } catch (error) {
        console.error('[toggleUserStatus]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/super-admin/users/:id/role
// ─────────────────────────────────────────────
const changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['super_admin', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }
        await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        res.json({ success: true, message: 'Role updated' });
    } catch (error) {
        console.error('[changeUserRole]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/super-admin/users/:id/reset-password
// ─────────────────────────────────────────────
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        const hashed = await bcrypt.hash(new_password, 12);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('[resetUserPassword]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/hostels  (full details)
// ─────────────────────────────────────────────
const getAllHostels = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT h.*,
                   ho.owner_name, ho.owner_email, ho.owner_phone,
                   COUNT(DISTINCT s.id) AS student_count,
                   COUNT(DISTINCT r.id) AS room_count,
                   COALESCE(SUM(p.amount), 0) AS total_collected
            FROM hostels h
            LEFT JOIN hostel_owners ho ON ho.id = h.owner_id
            LEFT JOIN students s ON s.hostel_id = h.id AND s.is_active = TRUE
            LEFT JOIN rooms r ON r.hostel_id = h.id AND r.is_active = TRUE
            LEFT JOIN payments p ON p.hostel_id = h.id
            WHERE 1=1
        `;
        const params = [];

        if (status === 'active') { query += ' AND h.is_active = TRUE'; }
        if (status === 'inactive') { query += ' AND h.is_active = FALSE'; }
        if (search) {
            query += ` AND (h.hostel_name ILIKE $${params.length + 1} OR h.city ILIKE $${params.length + 2} OR ho.owner_name ILIKE $${params.length + 3})`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' GROUP BY h.id, ho.owner_name, ho.owner_email, ho.owner_phone ORDER BY h.created_at DESC';

        const { rows: hostels } = await db.query(query, params);
        res.json({ success: true, data: hostels });
    } catch (error) {
        console.error('[getAllHostels]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// PATCH /api/super-admin/hostels/:id/status
// ─────────────────────────────────────────────
const toggleHostelStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await db.query('UPDATE hostels SET is_active = $1 WHERE id = $2', [is_active ? true : false, id]);
        res.json({ success: true, message: `Hostel ${is_active ? 'activated' : 'suspended'}` });
    } catch (error) {
        console.error('[toggleHostelStatus]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/students
// ─────────────────────────────────────────────
const getAllStudents = async (req, res) => {
    try {
        const { hostel_id, search } = req.query;
        let query = `
            SELECT s.*, h.hostel_name, r.room_number
            FROM students s
            JOIN hostels h ON s.hostel_id = h.id
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE s.is_active = TRUE
        `;
        const params = [];
        if (hostel_id) { query += ` AND s.hostel_id = $${params.length + 1}`; params.push(hostel_id); }
        if (search) {
            query += ` AND (s.full_name ILIKE $${params.length + 1} OR s.email ILIKE $${params.length + 2} OR s.phone ILIKE $${params.length + 3})`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY s.created_at DESC';

        const { rows: students } = await db.query(query, params);
        res.json({ success: true, data: students });
    } catch (error) {
        console.error('[getAllStudents]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/payments
// ─────────────────────────────────────────────
const getAllPayments = async (req, res) => {
    try {
        const { hostel_id, status, from_date, to_date, search } = req.query;
        let query = `
            SELECT p.*, f.month, f.status AS fee_status,
                   s.full_name AS student_name, s.email AS student_email,
                   h.hostel_name
            FROM payments p
            JOIN fees f ON p.fee_id = f.id
            JOIN students s ON p.student_id = s.id
            JOIN hostels h ON p.hostel_id = h.id
            WHERE 1=1
        `;
        const params = [];
        if (hostel_id) { query += ` AND p.hostel_id = $${params.length + 1}`; params.push(hostel_id); }
        if (from_date) { query += ` AND DATE(p.created_at) >= $${params.length + 1}`; params.push(from_date); }
        if (to_date) { query += ` AND DATE(p.created_at) <= $${params.length + 1}`; params.push(to_date); }
        if (search) {
            query += ` AND (s.full_name ILIKE $${params.length + 1} OR h.hostel_name ILIKE $${params.length + 2})`;
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY p.created_at DESC LIMIT 500';

        const { rows: payments } = await db.query(query, params);
        res.json({ success: true, data: payments });
    } catch (error) {
        console.error('[getAllPayments]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/fees
// ─────────────────────────────────────────────
const getAllFees = async (req, res) => {
    try {
        const { hostel_id, status } = req.query;
        let query = `
            SELECT f.*, s.full_name AS student_name, h.hostel_name
            FROM fees f
            JOIN students s ON f.student_id = s.id
            JOIN hostels h ON f.hostel_id = h.id
            WHERE 1=1
        `;
        const params = [];
        if (hostel_id) { query += ` AND f.hostel_id = $${params.length + 1}`; params.push(hostel_id); }
        if (status) { query += ` AND f.status = $${params.length + 1}`; params.push(status); }
        query += ' ORDER BY f.created_at DESC LIMIT 500';

        const { rows: fees } = await db.query(query, params);
        res.json({ success: true, data: fees });
    } catch (error) {
        console.error('[getAllFees]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/complaints
// ─────────────────────────────────────────────
const getAllComplaints = async (req, res) => {
    try {
        const { hostel_id, status, priority, search } = req.query;
        let query = `
            SELECT c.*, s.full_name AS student_name, h.hostel_name
            FROM complaints c
            LEFT JOIN students s ON c.student_id = s.id
            JOIN hostels h ON c.hostel_id = h.id
            WHERE 1=1
        `;
        const params = [];
        if (hostel_id) { query += ` AND c.hostel_id = $${params.length + 1}`; params.push(hostel_id); }
        if (status) { query += ` AND c.status = $${params.length + 1}`; params.push(status); }
        if (priority) { query += ` AND c.priority = $${params.length + 1}`; params.push(priority); }
        if (search) {
            query += ` AND (c.title ILIKE $${params.length + 1} OR s.full_name ILIKE $${params.length + 2} OR h.hostel_name ILIKE $${params.length + 3})`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY c.created_at DESC LIMIT 300';

        const { rows: complaints } = await db.query(query, params);
        res.json({ success: true, data: complaints });
    } catch (error) {
        console.error('[getAllComplaints]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/super-admin/complaints/:id
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE complaints SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: 'Complaint updated' });
    } catch (error) {
        console.error('[updateComplaintStatus]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/audit-logs
// ─────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
    try {
        const { user_id, entity, action, from_date, to_date, search } = req.query;
        let query = `
            SELECT al.*, u.email, u.role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (user_id) { query += ` AND al.user_id = $${params.length + 1}`; params.push(user_id); }
        if (entity) { query += ` AND al.entity = $${params.length + 1}`; params.push(entity); }
        if (action) { query += ` AND al.action ILIKE $${params.length + 1}`; params.push(`%${action}%`); }
        if (from_date) { query += ` AND DATE(al.created_at) >= $${params.length + 1}`; params.push(from_date); }
        if (to_date) { query += ` AND DATE(al.created_at) <= $${params.length + 1}`; params.push(to_date); }
        if (search) {
            query += ` AND (u.email ILIKE $${params.length + 1} OR al.action ILIKE $${params.length + 2} OR al.entity ILIKE $${params.length + 3})`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY al.created_at DESC LIMIT 200';

        const { rows: logs } = await db.query(query, params);
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('[getAuditLogs]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// POST /api/super-admin/notifications
// ─────────────────────────────────────────────
const sendNotification = async (req, res) => {
    try {
        const { title, message, target_role } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, error: 'title and message are required' });
        }
        const role = target_role || 'all';
        const { rows: result } = await db.query(
            'INSERT INTO platform_notifications (id, title, message, target_role) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id',
            [title, message, role]
        );
        // Log in audit
        await db.query(
            'INSERT INTO audit_logs (user_id, action, entity, details) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.user.id, 'SEND_NOTIFICATION', 'platform_notifications', JSON.stringify({ title, target_role: role })]
        );
        res.json({ success: true, message: 'Notification sent', data: { id: result[0].id } });
    } catch (error) {
        console.error('[sendNotification]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/super-admin/notifications
const getNotifications = async (req, res) => {
    try {
        const { rows: rows } = await db.query('SELECT * FROM platform_notifications ORDER BY created_at DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[getNotifications]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─────────────────────────────────────────────
// GET /api/super-admin/revenue-summary
// ─────────────────────────────────────────────
const getRevenueSummary = async (req, res) => {
    try {
        const { rows: byHostel } = await db.query(`
            SELECT h.hostel_name, h.city,
                   COALESCE(SUM(p.amount), 0) AS total_collected,
                   COUNT(p.id) AS payment_count
            FROM hostels h
            LEFT JOIN payments p ON p.hostel_id = h.id
            GROUP BY h.id
            ORDER BY total_collected DESC
        `);

        const { rows: byMonth } = await db.query(`
            SELECT TO_CHAR(p.created_at, 'Mon YYYY') AS label,
                   TO_CHAR(p.created_at, 'YYYY-MM') AS sort_key,
                   SUM(p.amount) AS revenue
            FROM payments p
            WHERE p.created_at >= NOW() - INTERVAL '12 months'
            GROUP BY TO_CHAR(p.created_at, 'Mon YYYY'), TO_CHAR(p.created_at, 'YYYY-MM')
            ORDER BY sort_key ASC
        `);

        const { rows: [totals] } = await db.query(`
            SELECT
                COALESCE(SUM(amount), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()) THEN amount END), 0) AS this_month,
                COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW() - INTERVAL '1 month') AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW() - INTERVAL '1 month') THEN amount END), 0) AS last_month
            FROM payments
        `);

        res.json({ success: true, data: { byHostel, byMonth, totals } });
    } catch (error) {
        console.error('[getRevenueSummary]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    toggleUserStatus,
    changeUserRole,
    resetUserPassword,
    getAllHostels,
    toggleHostelStatus,
    getAllStudents,
    getAllPayments,
    getAllFees,
    getAllComplaints,
    updateComplaintStatus,
    getAuditLogs,
    sendNotification,
    getNotifications,
    getRevenueSummary,
};
