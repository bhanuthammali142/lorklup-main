require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { sanitizeRequest } = require('./middleware/validation')

const authRoutes       = require('./routes/authRoutes')
const hostelRoutes     = require('./routes/hostelRoutes')
const studentRoutes    = require('./routes/studentRoutes')
const roomRoutes       = require('./routes/roomRoutes')
const miscRoutes       = require('./routes/miscRoutes')
const superAdminRoutes = require('./routes/superAdminRoutes')
const subscriptionRoutes = require('./routes/subscriptionRoutes')
const webhookRoutes = require('./routes/webhookRoutes')

const app = express()

// Security: Validate JWT_SECRET on startup
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!')
  console.error('   Set a strong secret: export JWT_SECRET=$(openssl rand -base64 32)')
  process.exit(1)
}

if (process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET is too weak! It must be at least 32 characters long in production.')
    process.exit(1)
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET is too weak (less than 32 characters)! Generate a stronger secret for production.')
  }
}

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// Security: Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // higher limit in dev to prevent blocks
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // higher limit in dev to prevent lockout
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
})

// CORS — configured for security
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL,
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }
    console.warn('❌ CORS blocked origin:', origin)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))



app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Apply input sanitization to all requests (prevents XSS and injection attacks)
app.use(sanitizeRequest)

// ── HEALTH CHECKS & ROOT ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Welcome to HostelOS API. The backend is running successfully.');
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HostelOS API is running', timestamp: new Date().toISOString() })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HostelOS API is running', timestamp: new Date().toISOString() })
})

// ── API ROUTES ─────────────────────────────────────────────────────────────────
// Apply stricter rate limiting to auth routes
app.use('/api/auth',    authLimiter, authRoutes)
app.use('/auth',        authLimiter, authRoutes)  // backward compatibility

// Apply general API rate limiting to all other routes
app.use('/api/hostels',     apiLimiter, hostelRoutes)
app.use('/api/students',    apiLimiter, studentRoutes)
app.use('/api/rooms',       apiLimiter, roomRoutes)
app.use('/api',            apiLimiter, miscRoutes)
app.use('/api/super-admin', apiLimiter, superAdminRoutes)
app.use('/api/billing',     subscriptionRoutes)
app.use('/api/webhooks',    webhookRoutes)

// ── TEST ROUTE ─────────────────────────────────────────────────────────────────
app.get('/test', (req, res) => {
  res.json({ message: 'HostelOS backend is working!', env: process.env.NODE_ENV || 'development' })
})

// ── 404 HANDLER ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path)
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err.message)

  // Don't leak internal details in production
  const isDev = process.env.NODE_ENV === 'development'
  const message = isDev ? err.message : 'Internal server error'

  // Handle CORS errors gracefully
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' })
  }

  res.status(err.status || 500).json({
    error: message,
    ...(isDev && { stack: err.stack })
  })
})

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HostelOS API running on port ${PORT}`)
  console.log(`🔐 Auth: /api/auth/login`)
  console.log(`🏥 Health: /api/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// ── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  server.close(() => {
    console.log('✅ HTTP server closed')
    // Close database connections
    const db = require('./config/db')
    db.end().then(() => {
      console.log('✅ Database connections closed')
      process.exit(0)
    }).catch((err) => {
      console.error('❌ Error closing database:', err)
      process.exit(1)
    })
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})