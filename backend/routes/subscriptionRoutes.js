const express = require('express');
const router = express.Router();
const { getMySubscription, createCheckoutSession, verifySubscriptionPayment, downloadInvoice } = require('../controllers/subscriptionController');
const { verifyToken } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');

// Base path: /api/billing
router.use(verifyToken);
router.use(tenantGuard);
router.use(subscriptionGuard);

router.get('/my-subscription', getMySubscription);
router.post('/subscribe', createCheckoutSession);
router.post('/verify', verifySubscriptionPayment);
router.get('/invoices/:id/download', downloadInvoice);

module.exports = router;
