const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// POST /api/webhooks/razorpay
router.post('/razorpay', express.json(), async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.error('❌ Security alert: RAZORPAY_WEBHOOK_SECRET is not configured.');
            return res.status(500).send('Webhook signature verification is not configured.');
        }

        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).send('Signature missing');
        }

        const bodyString = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(400).send('Invalid signature');
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'subscription.charged') {
            const subscription = payload.subscription.entity;
            const payment = payload.payment.entity;

            // Update subscription to active, extend date by 1 month (or whatever the plan is)
            await db.query(`
                UPDATE subscriptions 
                SET status = 'active', 
                    current_period_end = NOW() + INTERVAL '1 month',
                    updated_at = NOW()
                WHERE razorpay_subscription_id = $1
            `, [subscription.id]);

            // We don't have hostel_id easily here unless we query it using razorpay_subscription_id
            const { rows: [subRecord] } = await db.query(
                'SELECT hostel_id, plan_id FROM subscriptions WHERE razorpay_subscription_id = $1',
                [subscription.id]
            );

            if (subRecord) {
                const invoiceId = crypto.randomUUID();
                await db.query(`
                    INSERT INTO platform_invoices (id, hostel_id, amount, status, paid_at, razorpay_payment_id)
                    VALUES ($1, $2, $3, 'paid', NOW(), $4)
                `, [invoiceId, subRecord.hostel_id, payment.amount / 100, payment.id]);
            }
        } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
            const subscription = payload.subscription.entity;
            await db.query(`
                UPDATE subscriptions 
                SET status = $1, 
                    updated_at = NOW()
                WHERE razorpay_subscription_id = $2
            `, [event === 'subscription.halted' ? 'past_due' : 'canceled', subscription.id]);
        }

        res.status(200).send('Webhook processed');
    } catch (error) {
        console.error('[Razorpay Webhook Error]', error);
        res.status(500).send('Webhook error');
    }
});

module.exports = router;
