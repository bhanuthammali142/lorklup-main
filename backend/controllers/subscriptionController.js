const db = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// GET /api/billing/my-subscription
const getMySubscription = async (req, res) => {
    try {
        const hostelId = req.user.hostel_id;
        if (!hostelId) {
            return res.status(403).json({ success: false, error: 'Hostel ID not found in session' });
        }

        // Fetch payments log
        const { rows: payments } = await db.query(
            'SELECT * FROM payments WHERE hostel_id = $1 ORDER BY created_at DESC',
            [hostelId]
        );

        // Fetch invoices log
        const { rows: invoices } = await db.query(
            'SELECT * FROM invoices WHERE hostel_id = $1 ORDER BY created_at DESC',
            [hostelId]
        );

        res.json({
            success: true,
            data: {
                subscription: req.subscription, // populated by subscriptionGuard
                payments,
                invoices
            }
        });
    } catch (error) {
        console.error('[getMySubscription]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/billing/subscribe
const createCheckoutSession = async (req, res) => {
    try {
        const hostelId = req.user.hostel_id;
        if (!hostelId) {
            return res.status(403).json({ success: false, error: 'Hostel ID not found in session' });
        }

        const billingCycle = req.body.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

        // Fetch active settings for monthly/annual price and GST percentage
        let price = 999.00;
        let gstPercentage = 18.00;

        const priceKey = billingCycle === 'yearly' ? 'annual_price' : 'monthly_price';
        const defaultPrice = billingCycle === 'yearly' ? 9999.00 : 999.00;

        const { rows: priceRows } = await db.query("SELECT value FROM platform_settings WHERE key = $1", [priceKey]).catch(() => ({ rows: [] }));
        if (priceRows.length > 0) {
            price = parseFloat(priceRows[0].value) || defaultPrice;
        } else {
            price = defaultPrice;
        }

        const { rows: gstRows } = await db.query("SELECT value FROM platform_settings WHERE key = 'gst_percentage'").catch(() => ({ rows: [] }));
        if (gstRows.length > 0) {
            gstPercentage = parseFloat(gstRows[0].value) || 18.00;
        }

        const gstAmount = Number(((price * gstPercentage) / 100).toFixed(2));
        const totalAmount = Number((price + gstAmount).toFixed(2));

        // Create a standard Razorpay Order
        const orderOptions = {
            amount: Math.round(totalAmount * 100), // in paise
            currency: 'INR',
            receipt: `sub_${hostelId}_${Date.now()}`
        };

        const order = await razorpay.orders.create(orderOptions);

        // Fetch current subscription
        let { rows: [subscription] } = await db.query(
            'SELECT * FROM subscriptions WHERE hostel_id = $1',
            [hostelId]
        );

        if (!subscription) {
            // Should be initialized by guard, but fallback just in case
            const subId = crypto.randomUUID();
            const { rows: [newSub] } = await db.query(`
                INSERT INTO subscriptions (
                    id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, status, billing_cycle
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment', $8)
                RETURNING *
            `, [subId, hostelId, 'HostelOS Professional', price, gstPercentage, gstAmount, totalAmount, billingCycle]);
            subscription = newSub;
        } else {
            // Update subscription with target plan pricing and cycle before checkout payment
            await db.query(`
                UPDATE subscriptions
                SET plan_price = $1,
                    gst_percentage = $2,
                    gst_amount = $3,
                    total_amount = $4,
                    billing_cycle = $5,
                    updated_at = NOW()
                WHERE id = $6
            `, [price, gstPercentage, gstAmount, totalAmount, billingCycle, subscription.id]);
        }

        // Create a pending payment record using order ID as transaction_id temporarily
        const paymentId = crypto.randomUUID();
        const invoiceNumber = `INV-${Date.now()}-${hostelId}`;

        await db.query(`
            INSERT INTO payments (
                id, hostel_id, subscription_id, payment_gateway, transaction_id, 
                amount, gst_amount, total_amount, payment_status, invoice_number, billing_cycle
            ) VALUES ($1, $2, $3, 'razorpay', $4, $5, $6, $7, 'pending', $8, $9)
        `, [paymentId, hostelId, subscription.id, order.id, price, gstAmount, totalAmount, invoiceNumber, billingCycle]);

        res.json({
            success: true,
            data: {
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy'
            }
        });
    } catch (error) {
        console.error('[createCheckoutSession]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/billing/verify
const verifySubscriptionPayment = async (req, res) => {
    try {
        const hostelId = req.user.hostel_id;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Missing Razorpay details' });
        }

        // Verify Razorpay signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: "Invalid payment signature verification" });
        }

        // Find the pending payment
        const { rows: [pendingPayment] } = await db.query(
            'SELECT * FROM payments WHERE transaction_id = $1 AND payment_status = $2',
            [razorpay_order_id, 'pending']
        );

        if (!pendingPayment) {
            return res.status(404).json({ success: false, error: 'Payment transaction record not found' });
        }

        // Update payment status to paid
        const { rows: [payment] } = await db.query(`
            UPDATE payments
            SET payment_status = 'paid',
                payment_date = NOW(),
                transaction_id = $1
            WHERE id = $2
            RETURNING *
        `, [razorpay_payment_id, pendingPayment.id]);

        // Fetch subscription
        const { rows: [subscription] } = await db.query(
            'SELECT * FROM subscriptions WHERE id = $1',
            [pendingPayment.subscription_id]
        );

        // Calculate new next billing date
        const now = new Date();
        const durationDays = pendingPayment.billing_cycle === 'yearly' ? 365 : 30;
        let newNextBillingDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        
        // If current subscription is active and next billing date is in the future, extend from that date
        if (subscription && subscription.status === 'active' && subscription.next_billing_date && new Date(subscription.next_billing_date) > now) {
            newNextBillingDate = new Date(new Date(subscription.next_billing_date).getTime() + durationDays * 24 * 60 * 60 * 1000);
        }

        // Update subscription
        await db.query(`
            UPDATE subscriptions
            SET status = 'active',
                start_date = COALESCE(start_date, NOW()),
                end_date = $1,
                next_billing_date = $1,
                billing_cycle = $3,
                updated_at = NOW()
            WHERE id = $2
        `, [newNextBillingDate, pendingPayment.subscription_id, pendingPayment.billing_cycle || 'monthly']);

        // Insert invoice record
        const invoiceId = crypto.randomUUID();
        await db.query(`
            INSERT INTO invoices (id, hostel_id, payment_id, invoice_number)
            VALUES ($1, $2, $3, $4)
        `, [invoiceId, hostelId, payment.id, payment.invoice_number]);

        res.json({ success: true, message: "Subscription activated successfully!", data: { invoice_number: payment.invoice_number } });
    } catch (error) {
        console.error('[verifySubscriptionPayment]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/billing/invoices/:id/download
const downloadInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;

        const { rows: [invoice] } = await db.query(`
            SELECT i.*, p.amount, p.gst_amount, p.total_amount, p.payment_date, p.billing_cycle,
                   h.hostel_name, ho.owner_name, ho.owner_phone
            FROM invoices i
            JOIN payments p ON i.payment_id = p.id
            JOIN hostels h ON i.hostel_id = h.id
            LEFT JOIN hostel_owners ho ON h.owner_id = ho.id
            WHERE i.id = $1
        `, [invoiceId]);

        if (!invoice) {
            return res.status(404).send('Invoice not found');
        }

        // Access check
        if (req.user.role !== 'super_admin' && invoice.hostel_id !== req.user.hostel_id) {
            return res.status(403).send('Unauthorized to view this invoice');
        }

        const formattedDate = invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }) : 'N/A';

        const buyerName = invoice.owner_name || 'Hostel Owner';

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Invoice - ${invoice.invoice_number}</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: #2D3748;
                    margin: 0;
                    padding: 40px;
                    background-color: #F7FAFC;
                }
                .invoice-card {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #FFF;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border-top: 8px solid #4F46E5;
                }
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #E2E8F0;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .brand {
                    font-size: 28px;
                    font-weight: 800;
                    color: #4F46E5;
                    letter-spacing: -0.5px;
                }
                .brand span {
                    color: #111827;
                }
                .invoice-title {
                    text-align: right;
                }
                .invoice-title h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #1F2937;
                    font-weight: 700;
                }
                .invoice-details-meta {
                    margin-top: 5px;
                    font-size: 14px;
                    color: #718096;
                }
                .addresses {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 40px;
                    gap: 40px;
                }
                .address-block {
                    flex: 1;
                }
                .address-block h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    text-transform: uppercase;
                    color: #A0AEC0;
                    letter-spacing: 1px;
                }
                .address-block p {
                    margin: 4px 0;
                    font-size: 15px;
                    line-height: 1.5;
                }
                .table-container {
                    margin-bottom: 30px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th {
                    background-color: #F8FAFC;
                    color: #475569;
                    font-weight: 600;
                    text-align: left;
                    padding: 12px 16px;
                    border-bottom: 2px solid #E2E8F0;
                    font-size: 14px;
                }
                td {
                    padding: 16px;
                    border-bottom: 1px solid #E2E8F0;
                    font-size: 15px;
                }
                .text-right {
                    text-align: right;
                }
                .summary-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 20px;
                }
                .summary-table {
                    width: 300px;
                }
                .summary-table tr td {
                    padding: 8px 0;
                    border-bottom: none;
                }
                .summary-table tr.total-row td {
                    border-top: 2px solid #E2E8F0;
                    font-weight: 700;
                    font-size: 18px;
                    color: #4F46E5;
                    padding-top: 12px;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 14px;
                    color: #A0AEC0;
                    border-top: 1px solid #E2E8F0;
                    padding-top: 20px;
                }
                .btn-print {
                    background-color: #4F46E5;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 20px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-print:hover {
                    background-color: #4338CA;
                }
                @media print {
                    body {
                        background-color: #FFF;
                        padding: 0;
                    }
                    .invoice-card {
                        box-shadow: none;
                        padding: 0;
                        border-top: none;
                    }
                    .btn-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div style="max-width: 800px; margin: 0 auto; text-align: right;">
                <button class="btn-print" onclick="window.print()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v5h12v-5M6 14h12"/></svg>
                    Print Invoice
                </button>
            </div>
            <div class="invoice-card">
                <div class="header-section">
                    <div class="brand">Hostel<span>OS</span></div>
                    <div class="invoice-title">
                        <h1>TAX INVOICE</h1>
                        <div class="invoice-details-meta">
                            Invoice: <strong>${invoice.invoice_number}</strong><br>
                            Date: ${formattedDate}
                        </div>
                    </div>
                </div>

                <div class="addresses">
                    <div class="address-block">
                        <h3>Provider</h3>
                        <p><strong>HostelOS Technologies Pvt Ltd</strong></p>
                        <p>102, Innovation Hub, BKC</p>
                        <p>Mumbai, Maharashtra, 400051</p>
                        <p>GSTIN: 27AAAAA1111A1Z1</p>
                        <p>Email: billing@hostelos.in</p>
                    </div>
                    <div class="address-block">
                        <h3>Billed To</h3>
                        <p><strong>${invoice.hostel_name}</strong></p>
                        <p>Proprietor: ${buyerName}</p>
                        <p>Phone: ${invoice.owner_phone || 'N/A'}</p>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th class="text-right">Rate</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">GST (18%)</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>HostelOS Professional Plan Subscription (${invoice.billing_cycle === 'yearly' ? 'Annual' : 'Monthly'})</strong><br>
                                    <span style="font-size:12px; color:#718096;">SaaS Platform Access (${invoice.billing_cycle === 'yearly' ? '365 days' : '30 days'} period)</span>
                                </td>
                                <td class="text-right">₹${Number(invoice.amount).toFixed(2)}</td>
                                <td class="text-right">1</td>
                                <td class="text-right">₹${Number(invoice.gst_amount).toFixed(2)}</td>
                                <td class="text-right">₹${Number(invoice.total_amount).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="summary-container">
                    <table class="summary-table">
                        <tr>
                            <td>Subtotal</td>
                            <td class="text-right">₹${Number(invoice.amount).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>CGST (9%)</td>
                            <td class="text-right">₹${(Number(invoice.gst_amount) / 2).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>SGST (9%)</td>
                            <td class="text-right">₹${(Number(invoice.gst_amount) / 2).toFixed(2)}</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total Paid</td>
                            <td class="text-right">₹${Number(invoice.total_amount).toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <div class="footer">
                    <p>This is a computer-generated document and does not require a physical signature.</p>
                    <p>HostelOS Technologies Pvt Ltd &bull; www.hostelos.in</p>
                </div>
            </div>
        </body>
        </html>
        `;

        res.send(html);
    } catch (error) {
        console.error('[downloadInvoice]', error);
        res.status(500).send('Error generating invoice: ' + error.message);
    }
};

// ── SUPER ADMIN CONTROLLERS ──────────────────────────────────────────────────

// GET /api/super-admin/billing/stats
const getBillingStats = async (req, res) => {
    try {
        // Active Subscriptions
        const { rows: [{ active_count }] } = await db.query(
            "SELECT COUNT(*) AS active_count FROM subscriptions WHERE status = 'active'"
        );

        // Trialing Subscriptions
        const { rows: [{ trialing_count }] } = await db.query(
            "SELECT COUNT(*) AS trialing_count FROM subscriptions WHERE status = 'trialing'"
        );

        // Expired Subscriptions
        const { rows: [{ expired_count }] } = await db.query(
            "SELECT COUNT(*) AS expired_count FROM subscriptions WHERE status = 'expired'"
        );

        // Total GST collected
        const { rows: [{ total_gst }] } = await db.query(
            "SELECT COALESCE(SUM(gst_amount), 0) AS total_gst FROM payments WHERE payment_status = 'paid'"
        );

        // Total Revenue collected
        const { rows: [{ total_revenue }] } = await db.query(
            "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM payments WHERE payment_status = 'paid'"
        );

        // Monthly Recurring Revenue (MRR)
        // For yearly subscriptions, monthly recurring value is plan_price / 12
        const { rows: [{ mrr }] } = await db.query(`
            SELECT COALESCE(SUM(
                CASE WHEN billing_cycle = 'yearly' THEN plan_price / 12.0
                ELSE plan_price END
            ), 0) AS mrr 
            FROM subscriptions 
            WHERE status IN ('active', 'trialing')
        `);

        // Recent platform transactions (SaaS)
        const { rows: recentTransactions } = await db.query(`
            SELECT p.*, h.hostel_name
            FROM payments p
            JOIN hostels h ON p.hostel_id = h.id
            ORDER BY p.created_at DESC LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    active_subscriptions: parseInt(active_count, 10),
                    trialing_subscriptions: parseInt(trialing_count, 10),
                    expired_subscriptions: parseInt(expired_count, 10),
                    total_gst_collected: Number(total_gst),
                    total_revenue: Number(total_revenue),
                    mrr: Number(mrr)
                },
                recentTransactions
            }
        });
    } catch (error) {
        console.error('[getBillingStats]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/super-admin/billing/subscriptions
const getAllSubscriptions = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT s.*, h.hostel_name, h.is_active AS hostel_active,
                   COALESCE(ho.owner_name, 'No Owner') AS owner_name,
                   COALESCE(ho.owner_phone, 'N/A') AS owner_phone
            FROM subscriptions s
            JOIN hostels h ON s.hostel_id = h.id
            LEFT JOIN hostel_owners ho ON h.owner_id = ho.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND s.status = $${params.length + 1}`;
            params.push(status);
        }

        if (search) {
            query += ` AND (h.hostel_name ILIKE $${params.length + 1} OR ho.owner_name ILIKE $${params.length + 2})`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY s.created_at DESC';

        const { rows } = await db.query(query, params);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[getAllSubscriptions]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/super-admin/billing/subscriptions/:id/status
const manuallyToggleSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // active, suspended, expired, trialing

        const validStatuses = ['active', 'suspended', 'expired', 'trialing'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { rows: [subscription] } = await db.query(
            'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        res.json({
            success: true,
            message: `Subscription status updated to ${status} successfully`,
            data: subscription
        });
    } catch (error) {
        console.error('[manuallyToggleSubscription]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/super-admin/billing/settings
const getBillingSettings = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM platform_settings');
        const settings = {};
        rows.forEach(r => {
            settings[r.key] = r.value;
        });

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('[getBillingSettings]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/super-admin/billing/settings
const updateBillingSettings = async (req, res) => {
    try {
        const settings = req.body; // e.g. { monthly_price: "999", grace_period_days: "5" }

        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO platform_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [key, String(value)]);
        }

        res.json({
            success: true,
            message: 'Billing settings updated successfully'
        });
    } catch (error) {
        console.error('[updateBillingSettings]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getMySubscription,
    createCheckoutSession,
    verifySubscriptionPayment,
    downloadInvoice,
    getBillingStats,
    getAllSubscriptions,
    manuallyToggleSubscription,
    getBillingSettings,
    updateBillingSettings
};
