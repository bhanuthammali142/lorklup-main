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

        // Use rawBody if available, fallback to JSON.stringify(req.body)
        const payloadStr = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payloadStr)
            .digest('hex');

        if (signature !== expectedSignature) {
            // Also try with JSON.stringify just in case of mismatch
            const fallbackSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== fallbackSignature) {
                console.warn('⚠️ Webhook Signature Mismatch');
                return res.status(400).send('Invalid signature');
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'subscription.charged') {
            const rzpSubscription = payload.subscription.entity;
            const rzpPayment = payload.payment.entity;

            // Fetch the subscription record
            const { rows: [subscription] } = await db.query(
                'SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1',
                [rzpSubscription.id]
            );

            if (subscription) {
                const hostelId = subscription.hostel_id;
                
                // Calculate next billing date (extend 30 days)
                const now = new Date();
                let newNextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                if (subscription.next_billing_date && new Date(subscription.next_billing_date) > now) {
                    newNextBillingDate = new Date(new Date(subscription.next_billing_date).getTime() + 30 * 24 * 60 * 60 * 1000);
                }

                // Update subscription
                await db.query(`
                    UPDATE subscriptions 
                    SET status = 'active', 
                        end_date = $1,
                        next_billing_date = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [newNextBillingDate, subscription.id]);

                // Create paid payment record
                const paymentId = crypto.randomUUID();
                const invoiceNumber = `INV-${Date.now()}-${hostelId}`;

                const { rows: [payment] } = await db.query(`
                    INSERT INTO payments (
                        id, hostel_id, subscription_id, payment_gateway, transaction_id, 
                        amount, gst_amount, total_amount, payment_status, payment_date, invoice_number
                    ) VALUES ($1, $2, $3, 'razorpay', $4, $5, $6, $7, 'paid', NOW(), $8)
                    RETURNING *
                `, [
                    paymentId, 
                    hostelId, 
                    subscription.id, 
                    rzpPayment.id, 
                    subscription.plan_price, 
                    subscription.gst_amount, 
                    subscription.total_amount, 
                    invoiceNumber
                ]);

                // Create invoice record
                const invoiceId = crypto.randomUUID();
                await db.query(`
                    INSERT INTO invoices (id, hostel_id, payment_id, invoice_number)
                    VALUES ($1, $2, $3, $4)
                `, [invoiceId, hostelId, payment.id, payment.invoice_number]);

                console.log(`✅ Webhook processed subscription.charged for hostel_id=${hostelId}`);
            } else {
                console.warn(`⚠️ Webhook: Subscription not found for razorpay_subscription_id=${rzpSubscription.id}`);
            }
        } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
            const rzpSubscription = payload.subscription.entity;
            const newStatus = event === 'subscription.halted' ? 'suspended' : 'canceled';

            await db.query(`
                UPDATE subscriptions 
                SET status = $1, 
                    updated_at = NOW()
                WHERE razorpay_subscription_id = $2
            `, [newStatus, rzpSubscription.id]);

            console.log(`✅ Webhook processed ${event} -> set status to ${newStatus}`);
        }

        res.status(200).send('Webhook processed');
    } catch (error) {
        console.error('[Razorpay Webhook Error]', error);
        res.status(500).send('Webhook error');
    }
});

module.exports = router;
