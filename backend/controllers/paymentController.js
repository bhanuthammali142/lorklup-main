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
// ─────────────────────────────────────────────
// POST /api/payments/create-order
// Creates a Razorpay order for a fee payment
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { fee_id } = req.body;

    if (!rzp) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment gateway not configured' 
      });
    }

    if (!fee_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'fee_id is required' 
      });
    }

    // Load fee record from database
    const { rows: [fee] } = await db.query(
      'SELECT * FROM fees WHERE id = $1',
      [fee_id]
    );

    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fee record not found' 
      });
    }

    if (fee.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        error: 'Fee is already paid' 
      });
    }

    // Verify ownership of the fee
    if (req.user.role === 'student') {
      const { rows: studentRows } = await db.query(
        'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (studentRows.length === 0 || fee.student_id !== studentRows[0].id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: This fee does not belong to you' 
        });
      }
    } else if (req.user.role === 'admin') {
      if (fee.hostel_id !== req.user.hostel_id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: This fee belongs to another hostel' 
        });
      }
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Calculate server-side amount based on actual due_amount
    const price = Number(fee.due_amount);
    const baseAmount = Math.round(price * 100);
    const convenienceFee = Math.round(baseAmount * 0.03); // 3% convenience fee
    const totalAmount = baseAmount + convenienceFee;

    const order = await rzp.orders.create({
      amount: totalAmount,
      currency: 'INR',
      receipt: fee_id,
      notes: {
        hostel_id: fee.hostel_id,
        fee_id: fee_id,
        convenience_fee_paise: convenienceFee
      }
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: price,
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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !fee_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing Razorpay verification details' 
      });
    }

    if (!rzp) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment gateway not configured' 
      });
    }

    // Load fee record from database
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

    // Verify ownership of the fee
    if (req.user.role === 'student') {
      const { rows: studentRows } = await db.query(
        'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (studentRows.length === 0 || fee.student_id !== studentRows[0].id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: This fee does not belong to you' 
        });
      }
    } else if (req.user.role === 'admin') {
      if (fee.hostel_id !== req.user.hostel_id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: This fee belongs to another hostel' 
        });
      }
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Fetch the order from Razorpay to verify receipt matches the fee_id (prevents order ID substitution)
    const orderDetails = await rzp.orders.fetch(razorpay_order_id);
    if (!orderDetails || orderDetails.receipt !== fee_id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order verification: Order does not match fee_id'
      });
    }

    // Verify signature in constant-time
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(generatedSignature, 'hex');
    const receivedBuffer = Buffer.from(razorpay_signature, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed' 
      });
    }

    // Create payment record
    const paymentId = crypto.randomUUID();
    await db.query(
      `INSERT INTO student_payments (id, hostel_id, fee_id, student_id, amount, payment_method, transaction_id)
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
      FROM student_payments p
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

// ─────────────────────────────────────────────
// POST /api/payments/offline/request
// Student requests an offline cash validation code
// ─────────────────────────────────────────────
const requestOfflinePayment = async (req, res) => {
  try {
    const { fee_id } = req.body;

    if (!fee_id) {
      return res.status(400).json({ success: false, error: 'fee_id is required' });
    }

    // Resolve student profile ID
    const { rows: studentRows } = await db.query(
      'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }
    const studentId = studentRows[0].id;

    // Verify fee belongs to this student
    const { rows: feeRows } = await db.query(
      'SELECT * FROM fees WHERE id = $1 AND student_id = $2',
      [fee_id, studentId]
    );

    if (feeRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Fee record not found' });
    }

    const fee = feeRows[0];
    if (fee.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Fee is already paid' });
    }

    // Generate secure 4-digit code (1000 - 9999)
    const code = crypto.randomInt(1000, 10000).toString();

    // Update fee with offline request details
    await db.query(
      `UPDATE fees 
         SET offline_code = $1, 
             offline_payment_status = 'pending', 
             offline_code_attempts = 0, 
             offline_code_created_at = NOW() 
       WHERE id = $2`,
      [code, fee_id]
    );

    res.json({ success: true, code, offline_payment_status: 'pending' });
  } catch (error) {
    console.error('[requestOfflinePayment]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/offline/verify
// Admin verifies the 4-digit cash code and marks fee as paid
// ─────────────────────────────────────────────
const verifyOfflinePayment = async (req, res) => {
  try {
    const { fee_id, code } = req.body;

    if (!fee_id || !code) {
      return res.status(400).json({ success: false, error: 'fee_id and 4-digit code required' });
    }

    // Fetch fee
    const { rows: feeRows } = await db.query(
      'SELECT * FROM fees WHERE id = $1',
      [fee_id]
    );

    if (feeRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Fee record not found' });
    }

    const fee = feeRows[0];

    // Enforce multi-tenant access check
    if (req.user.role !== 'super_admin' && String(fee.hostel_id) !== String(req.user.hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied: Fee belongs to another hostel' });
    }

    if (fee.offline_payment_status !== 'pending' || !fee.offline_code) {
      return res.status(400).json({ success: false, error: 'No offline cash payment request is pending for this fee' });
    }

    // Prevent brute force
    if (fee.offline_code_attempts >= 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification locked due to too many failed attempts. Student must request a new code.' 
      });
    }

    // Verify code
    if (fee.offline_code !== String(code).trim()) {
      const newAttempts = fee.offline_code_attempts + 1;
      
      if (newAttempts >= 3) {
        // Exceeded attempts: Lock and reset
        await db.query(
          `UPDATE fees 
              SET offline_payment_status = 'failed', 
                  offline_code = NULL, 
                  offline_code_attempts = $1 
            WHERE id = $2`,
          [newAttempts, fee_id]
        );
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid code. Verification locked after 3 failed attempts. Student must request a new code.' 
        });
      }

      await db.query(
        'UPDATE fees SET offline_code_attempts = $1 WHERE id = $2',
        [newAttempts, fee_id]
      );

      return res.status(400).json({ 
        success: false, 
        error: `Invalid verification code. Attempts remaining: ${3 - newAttempts}` 
      });
    }

    // Transaction to update fee and insert payment
    const receiptId = `REC-CASH-${Date.now()}`;
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');

      // Update fee
      await conn.query(
        `UPDATE fees 
            SET status = 'paid', 
                paid_amount = amount, 
                due_amount = 0, 
                paid_at = NOW(), 
                receipt_id = $1,
                offline_payment_status = 'verified',
                offline_code = NULL,
                offline_code_attempts = 0
          WHERE id = $2`,
        [receiptId, fee_id]
      );

      // Insert payment record
      const paymentId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO student_payments (id, hostel_id, fee_id, student_id, amount, payment_method, transaction_id)
         VALUES ($1, $2, $3, $4, $5, 'cash', $6)`,
        [paymentId, fee.hostel_id, fee_id, fee.student_id, fee.due_amount, receiptId]
      );

      // Create notification for student
      await conn.query(
        `INSERT INTO notifications (id, hostel_id, student_id, type, message)
         VALUES ($1, $2, $3, 'payment_received', $4)`,
        [
          crypto.randomUUID(),
          fee.hostel_id,
          fee.student_id,
          'payment_received',
          `Cash payment of ₹${fee.due_amount} verified by owner. Receipt generated.`
        ]
      );

      await conn.query('COMMIT');

      // Award points asynchronously for on-time payment
      try {
        const { triggerAutomaticAward } = require('./rewardController');
        const dueDate = new Date(fee.due_date);
        const now = new Date();
        if (now <= dueDate) {
          await triggerAutomaticAward('Early fee payment', fee.student_id, fee.hostel_id, 50);
        }
      } catch (rewardErr) {
        console.error('Failed to trigger automatic rewards:', rewardErr);
      }

      // Send email receipt asynchronously
      try {
        const { rows: studentRows } = await conn.query('SELECT email, full_name FROM students WHERE id = $1', [fee.student_id]);
        if (studentRows.length > 0 && studentRows[0].email) {
          const { sendPaymentReceiptEmail } = require('../utils/emailService');
          const monthLabel = fee.month
            ? new Date(fee.month).toLocaleString('default', { month: 'long', year: 'numeric' })
            : 'Unknown';
          sendPaymentReceiptEmail(
            studentRows[0].email,
            studentRows[0].full_name,
            receiptId,
            fee.due_amount,
            monthLabel,
            'cash'
          ).catch(mailErr => console.error('Failed to send cash receipt email:', mailErr));
        }
      } catch (emailErr) {
        console.error('Failed to resolve student email:', emailErr);
      }

      res.json({ success: true, message: 'Offline cash payment verified and fee marked as paid.' });
    } catch (txErr) {
      await conn.query('ROLLBACK');
      console.error('[verifyOfflinePayment Tx]', txErr);
      res.status(500).json({ success: false, error: 'Database transaction error during verification' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[verifyOfflinePayment]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  requestOfflinePayment,
  verifyOfflinePayment
};
