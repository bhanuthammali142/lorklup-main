const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const auditLog = require('../middleware/auditLogger')

// Import real controllers
const {
  getDashboardStats, getRevenueByMonth, getOccupancyByMonth,
  getComplaints, addComplaint, updateComplaint,
  getAnnouncements, addAnnouncement, deleteAnnouncement,
  getAttendance, markAttendance, getStudentAttendanceHistory,
  getFoodMenu, saveFoodMenu
} = require('../controllers/miscController')

const { getFees, addFee, generateBulkFees, processPayment, markOverdue, getStudentFees } = require('../controllers/feeController')
const { getStudents, addStudent, updateStudent, deleteStudent } = require('../controllers/studentController')
const { getRooms, addRoom, updateRoom, deleteRoom } = require('../controllers/roomController')
const { getHostels, createHostel, updateHostel, createHostelWithOwner } = require('../controllers/hostelController')

const tenantGuard = require('../middleware/tenantGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
router.use(verifyToken);
router.use(tenantGuard);
router.use(subscriptionGuard);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats)
router.get('/dashboard/revenue', getRevenueByMonth)
router.get('/dashboard/occupancy', getOccupancyByMonth)

// ── Complaints ───────────────────────────────────────────────────────────────
router.get('/complaints', getComplaints)
router.post('/complaints', auditLog('CREATE_COMPLAINT', 'complaint'), addComplaint)
router.put('/complaints/:id', auditLog('UPDATE_COMPLAINT', 'complaint'), updateComplaint)

// ── Announcements ────────────────────────────────────────────────────────────
router.get('/announcements', getAnnouncements)
router.post('/announcements', auditLog('CREATE_ANNOUNCEMENT', 'announcement'), addAnnouncement)
router.delete('/announcements/:id', auditLog('DELETE_ANNOUNCEMENT', 'announcement'), deleteAnnouncement)

// ── Attendance ───────────────────────────────────────────────────────────────
router.get('/attendance/student/:studentId', getStudentAttendanceHistory)
router.get('/attendance', getAttendance)
router.post('/attendance', auditLog('MARK_ATTENDANCE', 'attendance'), markAttendance)

// ── Food Menu ────────────────────────────────────────────────────────────────
router.get('/food-menu', getFoodMenu)
router.put('/food-menu', auditLog('UPDATE_FOOD_MENU', 'food_menu'), saveFoodMenu)

// ── Fees — order matters: specific routes before /:id ────────────────────────
router.get('/fees/student/:studentId', getStudentFees)
router.post('/fees/generate-bulk', auditLog('GENERATE_BULK_FEES', 'fee'), generateBulkFees)
router.post('/fees/mark-overdue', auditLog('MARK_FEES_OVERDUE', 'fee'), markOverdue)
router.get('/fees', getFees)
router.post('/fees', auditLog('CREATE_FEE', 'fee'), addFee)
router.post('/fees/:id/payment', auditLog('PROCESS_PAYMENT', 'fee'), processPayment)

// ── Students ─────────────────────────────────────────────────────────────────
router.get('/students', getStudents)
router.post('/students', auditLog('ADD_STUDENT', 'student'), addStudent)
router.put('/students/:id', auditLog('UPDATE_STUDENT', 'student'), updateStudent)
router.delete('/students/:id', auditLog('DELETE_STUDENT', 'student'), deleteStudent)

// ── Rooms ────────────────────────────────────────────────────────────────────
router.get('/rooms', getRooms)
router.post('/rooms', auditLog('ADD_ROOM', 'room'), addRoom)
router.put('/rooms/:id', updateRoom)
router.delete('/rooms/:id', deleteRoom)

// ── Rewards ─────────────────────────────────────────────────────────────────
const { getLeaderboard, getStudentRewards, awardPoints, redeemReward } = require('../controllers/rewardController')
router.get('/rewards/leaderboard', getLeaderboard)
router.get('/rewards/student/:studentId', getStudentRewards)
router.post('/rewards/award', auditLog('AWARD_POINTS', 'reward'), awardPoints)
router.post('/rewards/redeem', auditLog('REDEEM_REWARD', 'reward'), redeemReward)

// ── Payments ────────────────────────────────────────────────────────────────
const { createOrder, verifyPayment, getPaymentHistory, requestOfflinePayment, verifyOfflinePayment } = require('../controllers/paymentController')
router.post('/payments/create-order', createOrder)
router.post('/payments/verify-payment', verifyPayment)
router.get('/payments/history', getPaymentHistory)
router.post('/payments/offline/request', requestOfflinePayment)
router.post('/payments/offline/verify', verifyOfflinePayment)

// ── Notifications ───────────────────────────────────────────────────────────
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationController')
router.get('/notifications', getNotifications)
router.get('/notifications/unread-count', getUnreadCount)
router.patch('/notifications/read-all', markAllAsRead)
router.patch('/notifications/:id/read', markAsRead)

// Test route
router.get('/test', (req, res) => res.json({ message: 'Misc routes working!' }))

module.exports = router