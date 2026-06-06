const express = require('express');
const router  = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const ctrl = require('../controllers/superAdminController');
const billingCtrl = require('../controllers/subscriptionController');

// All routes require super_admin role
router.use(verifyToken);
router.use(checkRole('super_admin'));

// Dashboard
router.get('/dashboard',          ctrl.getDashboardStats);
router.get('/revenue-summary',    ctrl.getRevenueSummary);

// Users
router.get('/users',              ctrl.getAllUsers);
router.patch('/users/:id/status', ctrl.toggleUserStatus);
router.patch('/users/:id/role',   ctrl.changeUserRole);
router.patch('/users/:id/reset-password', ctrl.resetUserPassword);

// Hostels
router.get('/hostels',                 ctrl.getAllHostels);
router.patch('/hostels/:id/status',    ctrl.toggleHostelStatus);

// Students
router.get('/students',           ctrl.getAllStudents);

// Finance
router.get('/payments',           ctrl.getAllPayments);
router.get('/fees',               ctrl.getAllFees);

// Complaints
router.get('/complaints',               ctrl.getAllComplaints);
router.patch('/complaints/:id',         ctrl.updateComplaintStatus);

// Audit Logs
router.get('/audit-logs',         ctrl.getAuditLogs);

// Notifications
router.get('/notifications',      ctrl.getNotifications);
router.post('/notifications',     ctrl.sendNotification);

// Platform Billing (SaaS)
router.get('/billing/stats',          billingCtrl.getBillingStats);
router.get('/billing/subscriptions',  billingCtrl.getAllSubscriptions);
router.patch('/billing/subscriptions/:id/status', billingCtrl.manuallyToggleSubscription);
router.get('/billing/settings',       billingCtrl.getBillingSettings);
router.put('/billing/settings',       billingCtrl.updateBillingSettings);

module.exports = router;
