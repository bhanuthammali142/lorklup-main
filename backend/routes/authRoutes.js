const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const { login, register, me, changePassword, updateProfile, googleLogin, linkGoogle, unlinkGoogle, logoutAllDevices, googleStatus } = require('../controllers/authController')
const { verifyToken } = require('../middleware/auth')

// Rate limit for authentication attempts (login and registration) to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // 5 attempts per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
})

// Public routes
router.post('/login', authLimiter, login)
router.post('/register', authLimiter, register)
router.post('/google-login', authLimiter, googleLogin)

// Protected routes
router.get('/me', verifyToken, me)
router.put('/me', verifyToken, changePassword)
router.put('/profile', verifyToken, updateProfile)
router.post('/link-google', verifyToken, linkGoogle)
router.post('/unlink-google', verifyToken, unlinkGoogle)
router.post('/logout-all', verifyToken, logoutAllDevices)
router.get('/google-status', verifyToken, googleStatus)

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' })
})

module.exports = router