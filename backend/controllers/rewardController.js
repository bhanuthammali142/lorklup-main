/**
 * backend/controllers/rewardController.js
 * Handles student reward points and leaderboard
 */

const db = require('../config/db');
const crypto = require('crypto');

// ─────────────────────────────────────────────
// GET /api/rewards/leaderboard?hostel_id=X&period=monthly
// ─────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const { hostel_id, period = 'monthly' } = req.query;
    
    if (!hostel_id) {
      return res.status(400).json({ success: false, error: 'hostel_id required' });
    }

    const { rows: leaderboard } = await db.query(
      `SELECT 
        rl.rank,
        rl.total_points,
        s.id,
        s.full_name,
        s.email,
        (SELECT COUNT(*) FROM reward_leaderboard WHERE hostel_id = $1 AND period = $2) AS total_entries
      FROM reward_leaderboard rl
      JOIN students s ON rl.student_id = s.id
      WHERE rl.hostel_id = $1 AND rl.period = $2
      ORDER BY rl.rank ASC`,
      [hostel_id, period]
    );

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('[getLeaderboard]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/rewards/student/:studentId
// ─────────────────────────────────────────────
const getStudentRewards = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify ownership/permission
    if (req.user.role === 'student') {
      const { rows: selfRows } = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id])
      if (selfRows.length === 0 || selfRows[0].id !== studentId) {
        return res.status(403).json({ success: false, error: 'Access denied' })
      }
    } else if (req.user.role !== 'super_admin') {
      const { rows: studRows } = await db.query('SELECT hostel_id FROM students WHERE id = $1', [studentId])
      if (studRows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' })
      if (String(studRows[0].hostel_id) !== String(req.user.hostel_id)) {
        return res.status(403).json({ success: false, error: 'Access denied: Student belongs to another hostel' })
      }
    }

    const { rows: [totalPoints] } = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type='earned' THEN points ELSE -points END), 0) AS total
       FROM reward_points
       WHERE student_id = $1`,
      [studentId]
    );

    const { rows: history } = await db.query(
      `SELECT id, points, reason, type, created_at
       FROM reward_points
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [studentId]
    );

    res.json({ 
      success: true, 
      data: { 
        total_points: totalPoints?.total || 0,
        history 
      } 
    });
  } catch (error) {
    console.error('[getStudentRewards]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/rewards/award
// Award points to a student
// ─────────────────────────────────────────────
const awardPoints = async (req, res) => {
  try {
    const { student_id, points, reason, type = 'earned' } = req.body;
    const hostel_id = req.user.role === 'super_admin' ? req.body.hostel_id : req.user.hostel_id;

    if (!student_id || !hostel_id || points === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'student_id, hostel_id, and points required' 
      });
    }

    // Verify student belongs to this hostel
    const { rows: studRows } = await db.query('SELECT hostel_id FROM students WHERE id = $1', [student_id])
    if (studRows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' })
    if (String(studRows[0].hostel_id) !== String(hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied: Student belongs to another hostel' })
    }

    const id = crypto.randomUUID();

    await db.query(
      `INSERT INTO reward_points (id, student_id, hostel_id, points, reason, type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, student_id, hostel_id, points, reason || '', type]
    );

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[awardPoints]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/rewards/redeem
// Redeem points for a reward
// ─────────────────────────────────────────────
const redeemReward = async (req, res) => {
  try {
    const { student_id, points_cost, reward_name } = req.body;
    const hostel_id = req.user.role === 'super_admin' ? req.body.hostel_id : req.user.hostel_id;

    if (!student_id || !hostel_id || !points_cost) {
      return res.status(400).json({ 
        success: false, 
        error: 'student_id, hostel_id, and points_cost required' 
      });
    }

    // Verify student belongs to this hostel
    const { rows: studRows } = await db.query('SELECT hostel_id FROM students WHERE id = $1', [student_id])
    if (studRows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' })
    if (String(studRows[0].hostel_id) !== String(hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied: Student belongs to another hostel' })
    }

    // Check if student has enough points
    const { rows: [pointsRow] } = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type='earned' THEN points ELSE -points END), 0) AS total
       FROM reward_points
       WHERE student_id = $1`,
      [student_id]
    );

    const currentPoints = pointsRow?.total || 0;

    if (currentPoints < points_cost) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient points for this reward' 
      });
    }

    const id = crypto.randomUUID();

    // Deduct points
    await db.query(
      `INSERT INTO reward_points (id, student_id, hostel_id, points, reason, type)
       VALUES ($1, $2, $3, $4, $5, 'redeemed')`,
      [id, student_id, hostel_id, -points_cost, `Redeemed: ${reward_name || 'Reward'}`]
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (id, hostel_id, student_id, type, message)
       VALUES ($1, $2, $3, 'reward_redeemed', $4)`,
      [crypto.randomUUID(), hostel_id, student_id, `You redeemed ${reward_name || 'a reward'} for ${points_cost} points!`]
    );

    res.json({ success: true, message: 'Reward redeemed successfully' });
  } catch (error) {
    console.error('[redeemReward]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// Helper: Award points for automatic triggers
// ─────────────────────────────────────────────
const triggerAutomaticAward = async (reason, student_id, hostel_id, points) => {
  try {
    await db.query(
      `INSERT INTO reward_points (id, student_id, hostel_id, points, reason, type)
       VALUES ($1, $2, $3, $4, $5, 'earned')`,
      [crypto.randomUUID(), student_id, hostel_id, points, reason]
    );
  } catch (error) {
    console.error('[triggerAutomaticAward]', error);
  }
};

module.exports = {
  getLeaderboard,
  getStudentRewards,
  awardPoints,
  redeemReward,
  triggerAutomaticAward
};
