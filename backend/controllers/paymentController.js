/**
 * backend/controllers/paymentController.js
 * Handles payment processing via Razorpay
 */

const db = require('../config/db');
const crypto = require('crypto');

// Initialize Razorpay if credentials are available
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (err) {
  console.warn('⚠️ Razorpay not installed. Payment endpoints will not work.');
}

const rzp = Razorpay && process.env.RAZORPAY_KEY_ID
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

// ─────────────────────────────────────────────
// POST /api/payments/create-order
// Creates a Razorpay order for a fee payment
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { fee_id, amount, hostel_id } = req.body;

    if (!rzp) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment gateway not configured' 
      });
    }

    if (!fee_id || !amount || !hostel_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'fee_id, amount, and hostel_id required' 
      });
    }

    // Razorpay amounts must be in paise (integers)
    const baseAmount = Math.round(amount * 100);
    const convenienceFee = Math.round(baseAmount * 0.03); // 3% convenience fee
    const totalAmount = baseAmount + convenienceFee;

    const order = await rzp.orders.create({
      amount: totalAmount,
      currency: 'INR',
      receipt: fee_id,
      notes: {
        hostel_id,
        fee_id,
        convenience_fee_paise: convenienceFee
      }
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: amount,
        convenience_fee: convenienceFee / 100,
        total_amount: totalAmount / 100
      }
    });
  } catch (error) {
    console.error('[createOrder]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/verify-payment
// Verifies Razorpay payment and updates fee status
// ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing Razorpay verification details' 
      });
    }

    // Verify signature
    const crypto_module = require('crypto');
    const generatedSignature = crypto_module
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed' 
      });
    }

    // Update fee to paid
    const { rows: [fee] } = await db.query(
      'SELECT * FROM fees WHERE id = $1',
      [fee_id]
    );

    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fee not found' 
      });
    }

    // Create payment record
    const paymentId = crypto.randomUUID();
    await db.query(
      `INSERT INTO payments (id, hostel_id, fee_id, student_id, amount, payment_method, transaction_id)
       VALUES ($1, $2, $3, $4, $5, 'razorpay', $6)`,
      [paymentId, fee.hostel_id, fee_id, fee.student_id, fee.due_amount, razorpay_payment_id]
    );

    // Update fee status
    await db.query(
      `UPDATE fees 
       SET status = 'paid', paid_amount = amount, due_amount = 0, paid_at = NOW()
       WHERE id = $1`,
      [fee_id]
    );

    // Award points for on-time payment
    const { rows: [student] } = await db.query(
      'SELECT * FROM students WHERE id = $1',
      [fee.student_id]
    );

    const { triggerAutomaticAward } = require('./rewardController');
    const dueDate = new Date(fee.due_date);
    const now = new Date();

    if (now <= dueDate) {
      // On-time payment bonus
      await triggerAutomaticAward(
        'Early fee payment',
        fee.student_id,
        fee.hostel_id,
        50
      );
    }

    // Create notification
    await db.query(
      `INSERT INTO notifications (id, hostel_id, student_id, type, message)
       VALUES ($1, $2, $3, 'payment_received', $4)`,
      [
        crypto.randomUUID(),
        fee.hostel_id,
        fee.student_id,
        `Payment of ₹${fee.due_amount} received. Thank you!`
      ]
    );

    res.json({
      success: true,
      message: 'Payment verified and processed successfully',
      data: {
        payment_id: paymentId,
        fee_id: fee_id
      }
    });
  } catch (error) {
    console.error('[verifyPayment]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/webhook
// Razorpay webhook for payment updates
// ─────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    if (event === 'payment.authorized' || event === 'payment.failed') {
      // Handle async payment updates
      console.log(`Payment event: ${event}`, payload);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[handleWebhook]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/payments/history?hostel_id=X&student_id=Y
// ─────────────────────────────────────────────
const getPaymentHistory = async (req, res) => {
  try {
    const { hostel_id, student_id } = req.query;

    if (!hostel_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'hostel_id required' 
      });
    }

    let query = `
      SELECT p.*, s.full_name, f.month
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      JOIN students s ON p.student_id = s.id
      WHERE p.hostel_id = $1
    `;
    const params = [hostel_id];

    if (student_id) {
      query += ` AND p.student_id = $2`;
      params.push(student_id);
    }

    query += ' ORDER BY p.created_at DESC LIMIT 100';

    const { rows: payments } = await db.query(query, params);

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('[getPaymentHistory]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory
};
