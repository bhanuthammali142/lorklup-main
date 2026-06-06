const jwt = require('jsonwebtoken')
const db = require('../config/db')

// JWT_SECRET is validated on server startup in server.js
const JWT_SECRET = process.env.JWT_SECRET

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    // Safety check: Verify the user exists and is active in the database
    const { rows } = await db.query(
      'SELECT is_active, role FROM users WHERE id = $1',
      [decoded.id]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User account no longer exists' })
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ error: 'User account has been suspended' })
    }

    // Keep token values aligned with the database role
    decoded.role = rows[0].role

    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    console.error('[verifyToken] Auth check failed:', err)
    return res.status(500).json({ error: 'Authentication verification failed' })
  }
}

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` })
    }
    next()
  }
}

module.exports = { verifyToken, checkRole }