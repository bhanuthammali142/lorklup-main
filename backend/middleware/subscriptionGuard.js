const db = require('../config/db');

const subscriptionGuard = async (req, res, next) => {
  // 1. Super admins have full platform privileges
  if (req.user?.role === 'super_admin') {
    return next();
  }

  const hostelId = req.user?.hostel_id;
  if (!hostelId) {
    return next();
  }

  try {
    // 2. Fetch active settings for grace period length
    let gracePeriodDays = 5;
    const { rows: settingsRows } = await db.query(
      "SELECT value FROM platform_settings WHERE key = 'grace_period_days'"
    ).catch(() => ({ rows: [] }));
    if (settingsRows.length > 0) {
      gracePeriodDays = parseInt(settingsRows[0].value, 10) || 5;
    }

    // 3. Fetch current hostel subscription
    let { rows: [subscription] } = await db.query(
      'SELECT * FROM subscriptions WHERE hostel_id = $1',
      [hostelId]
    );

    // If no subscription exists, auto-initialize it based on onboarding model setting
    if (!subscription) {
      let onboardingModel = 'trial';
      const { rows: modelRows } = await db.query(
        "SELECT value FROM platform_settings WHERE key = 'subscription_onboarding_model'"
      ).catch(() => ({ rows: [] }));
      if (modelRows.length > 0) {
        onboardingModel = modelRows[0].value;
      }

      let trialDays = 7;
      const { rows: trialRows } = await db.query(
        "SELECT value FROM platform_settings WHERE key = 'trial_period_days'"
      ).catch(() => ({ rows: [] }));
      if (trialRows.length > 0) {
        trialDays = parseInt(trialRows[0].value, 10) || 7;
      }

      const subId = require('crypto').randomUUID();
      const status = onboardingModel === 'trial' ? 'trialing' : 'expired';
      
      const price = 999.00;
      const gstPercentage = 18.00;
      const gstAmount = 179.82;
      const totalAmount = 1178.82;

      // Calculate dates
      const startDate = new Date();
      const nextBillingDate = onboardingModel === 'trial'
        ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : startDate; // Expires immediately if pay_immediately is enabled
      const endDate = nextBillingDate;

      await db.query(`
        INSERT INTO subscriptions (
          id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
          start_date, end_date, next_billing_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [subId, hostelId, 'HostelOS Professional', price, gstPercentage, gstAmount, totalAmount, startDate, endDate, nextBillingDate, status]);

      // Re-query
      const { rows: [newSub] } = await db.query(
        'SELECT * FROM subscriptions WHERE hostel_id = $1',
        [hostelId]
      );
      subscription = newSub;
    }

    const now = new Date();
    const status = subscription.status;
    const nextBillingDate = subscription.next_billing_date ? new Date(subscription.next_billing_date) : new Date(subscription.end_date);

    // 4. Calculate subscription expiry and grace period window
    let isExpired = false;
    let isPastGracePeriod = false;
    let daysRemaining = 0;

    if (status === 'active' || status === 'trialing') {
      if (nextBillingDate && nextBillingDate < now) {
        isExpired = true;
      } else if (nextBillingDate) {
        daysRemaining = Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      isExpired = true;
    }

    if (isExpired && nextBillingDate) {
      const gracePeriodEnd = new Date(nextBillingDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
      if (now > gracePeriodEnd) {
        isPastGracePeriod = true;
      }
    }

    // Explicitly check if status is suspended or expired
    if (status === 'suspended' || status === 'expired') {
      isExpired = true;
      isPastGracePeriod = true; // Block actions immediately
    }

    // Attach billing payload to request
    req.subscription = {
      id: subscription.id,
      plan_name: subscription.plan_name,
      plan_price: Number(subscription.plan_price),
      gst_percentage: Number(subscription.gst_percentage),
      gst_amount: Number(subscription.gst_amount),
      total_amount: Number(subscription.total_amount),
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      next_billing_date: subscription.next_billing_date,
      status: subscription.status,
      billing_cycle: subscription.billing_cycle || 'monthly',
      isExpired,
      isPastGracePeriod,
      daysRemaining
    };

    // 5. Restrict modifying write actions if past the grace period
    if (isPastGracePeriod) {
      // White-listed paths (e.g., retrieving billing state, Razorpay actions, support tickets)
      const allowedPaths = [
        '/api/billing',
        '/api/payments/create-order',
        '/api/payments/verify-payment',
        '/api/tickets',
        '/api/auth',
        '/api/health'
      ];

      const isAllowed = allowedPaths.some(path => req.originalUrl.startsWith(path));

      if (!isAllowed && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return res.status(403).json({
          success: false,
          error: 'Your subscription has expired. Please renew to continue using HostelOS.',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
    }

    next();
  } catch (error) {
    console.error('[subscriptionGuard] Failure:', error);
    next();
  }
};

module.exports = subscriptionGuard;
