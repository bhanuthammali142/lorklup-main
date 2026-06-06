/**
 * backend/jobs/billingNotificationJob.js
 * Cron job to check for upcoming subscription renewals and create notifications
 *
 * Usage:
 *   node jobs/billingNotificationJob.js
 *
 * Schedule with cron (daily at midnight):
 *   0 0 * * * cd /path/to/backend && node jobs/billingNotificationJob.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');
const crypto = require('crypto');

async function runBillingNotifications() {
  console.log('🔔 Starting billing notifications job...');
  let alertCount = 0;

  try {
    // Fetch all active/trialing/expired subscriptions
    const { rows: subscriptions } = await db.query(
      `SELECT s.*, h.hostel_name, ho.owner_email 
       FROM subscriptions s
       JOIN hostels h ON s.hostel_id = h.id
       LEFT JOIN hostel_owners ho ON h.owner_id = ho.id`
    );

    console.log(`📋 Found ${subscriptions.length} subscriptions to analyze`);

    const now = new Date();

    for (const sub of subscriptions) {
      const nextBilling = sub.next_billing_date ? new Date(sub.next_billing_date) : null;
      if (!nextBilling) continue;

      const timeDiff = nextBilling.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      let message = '';
      let type = 'billing_alert';

      if (daysDiff === 7) {
        message = `⚠️ Your subscription ends in 7 days (on ${nextBilling.toLocaleDateString('en-IN')}). Please renew to avoid service disruption.`;
      } else if (daysDiff === 3) {
        message = `⚠️ Your subscription ends in 3 days (on ${nextBilling.toLocaleDateString('en-IN')}). Renew now to keep your dashboard active.`;
      } else if (daysDiff === 1) {
        message = `🚨 Your subscription ends tomorrow! Renew today to prevent dashboard write-blocking.`;
      } else if (daysDiff <= 0 || sub.status === 'expired' || sub.status === 'suspended') {
        message = `❌ Your subscription has expired. Access to dashboard modifying features is now restricted. Please renew immediately.`;
      }

      if (message) {
        // Check if we already sent a notification with this message content in the last 24 hours
        const { rows: existingAlerts } = await db.query(
          `SELECT id FROM notifications
           WHERE hostel_id = $1
             AND type = 'billing_alert'
             AND created_at >= NOW() - INTERVAL '24 hours'
             AND message = $2
           LIMIT 1`,
          [sub.hostel_id, message]
        );

        if (existingAlerts.length > 0) {
          continue; // Already notified recently
        }

        await db.query(
          `INSERT INTO notifications (id, hostel_id, type, message)
           VALUES ($1, $2, 'billing_alert', $3)`,
          [crypto.randomUUID(), sub.hostel_id, message]
        );

        alertCount++;
      }
    }

    console.log(`✅ Billing notifications job complete. Generated ${alertCount} alerts.`);
  } catch (error) {
    console.error('❌ Billing notifications job failed:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

runBillingNotifications();
