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

// Trust reverse proxy (Nginx) for correct client IP address in rate limiting
app.set('trust proxy', 1)

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
  crossOriginResourcePolicy: { policy: "cross-origin" },
}))

// Security: Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // higher limit in dev to prevent blocks
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

// CORS — configured for security
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://52-66-209-176.sslip.io',
  'http://52-66-209-176.sslip.io',
  'https://13-203-66-99.sslip.io',
  'http://13-203-66-99.sslip.io',
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
app.use('/api/auth',    authRoutes)
app.use('/auth',        authRoutes)  // backward compatibility

// ── SECURE DOCUMENT SERVING ROUTES ─────────────────────────────────────────────
const { verifyToken } = require('./middleware/auth')
const path = require('path')
const fs = require('fs')
const db = require('./config/db')
const { UPLOADS_DIR } = require('./utils/fileStorage')

// Route to get hostel owner profile photo
app.get('/api/documents/owners/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params
    
    // Safety check to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' })
    }

    const ownerIdMatch = filename.match(/^(\d+)_/)
    if (!ownerIdMatch) {
      return res.status(400).json({ error: 'Invalid filename format' })
    }
    const ownerId = parseInt(ownerIdMatch[1], 10)

    // Authorization:
    // 1. Super admin can access all
    // 2. The owner themselves can access their photo
    if (req.user.role !== 'super_admin') {
      // Check if logged in user is the owner
      const { rows } = await db.query('SELECT id FROM hostel_owners WHERE user_id = $1', [req.user.id])
      if (rows.length === 0 || rows[0].id !== ownerId) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    const filePath = path.join(UPLOADS_DIR, 'owners', filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    res.sendFile(filePath)
  } catch (err) {
    console.error('[GetOwnerDocument]', err)
    res.status(500).json({ error: 'Server error retrieving document' })
  }
})

// Route to get student document
app.get('/api/documents/students/:studentId/:filename', verifyToken, async (req, res) => {
  try {
    const { studentId, filename } = req.params

    // Safety check to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file request' })
    }

    // Role-based Access Rules:
    // - Super Admin: Access all
    // - Hostel Owner (admin): Only their hostel students
    // - Students: No access to uploaded documents, except their own profile photo
    if (req.user.role === 'student') {
      // Students can ONLY access their own profile photo (profile.jpg), not other documents (Aadhaar/ID card)
      const { rows: selfRows } = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id])
      if (selfRows.length === 0 || selfRows[0].id !== studentId || filename !== 'profile.jpg') {
        return res.status(403).json({ error: 'Access denied: Students cannot access uploaded documents' })
      }
    }

    // Get student details to find their hostel
    const { rows: studentRows } = await db.query('SELECT hostel_id FROM students WHERE id = $1', [studentId])
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' })
    }
    const studentHostelId = studentRows[0].hostel_id

    if (req.user.role !== 'super_admin' && req.user.role !== 'student') {
      // User is 'admin' (Hostel Owner). Check if they manage this hostel.
      if (req.user.hostel_id !== studentHostelId) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to view documents from this hostel' })
      }
    }

    const filePath = path.join(UPLOADS_DIR, 'students', studentId, filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    res.sendFile(filePath)
  } catch (err) {
    console.error('[GetStudentDocument]', err)
    res.status(500).json({ error: 'Server error retrieving document' })
  }
})

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
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ HostelOS API running on port ${PORT}`)
  console.log(`🔐 Auth: /api/auth/login`)
  console.log(`🏥 Health: /api/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)

  // Run database migration for hostel owner bank details and onboarding camera columns
  try {
    const db = require('./config/db')
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_linked_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS account_holder VARCHAR(150);
      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
      ALTER TABLE hostel_owners ADD COLUMN IF NOT EXISTS profile_photo_uploaded_at TIMESTAMP;
      
      ALTER TABLE students ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS monthly_payment_day INT DEFAULT 5;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS college_id_url TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE students ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    `)
    console.log('✅ Database migration: Google Auth columns, bank details, student, and onboarding columns verified/added successfully')
  } catch (err) {
    console.error('⚠️ Database migration failed:', err.message)
  }
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