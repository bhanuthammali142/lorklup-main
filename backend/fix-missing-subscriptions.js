const { Client } = require('pg');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runFix() {
  const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('Fetching hostels missing a subscription record...');
    const { rows: hostels } = await client.query(`
      SELECT id, hostel_name FROM hostels
      WHERE id NOT IN (SELECT hostel_id FROM subscriptions)
    `);

    console.log(`📋 Found ${hostels.length} hostels needing subscriptions.`);

    let count = 0;
    for (const hostel of hostels) {
      const subId = crypto.randomUUID();
      const startDate = new Date();
      const nextBillingDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days trial

      await client.query(`
        INSERT INTO subscriptions (
          id, hostel_id, plan_name, plan_price, gst_percentage, gst_amount, total_amount, 
          start_date, end_date, next_billing_date, status, billing_cycle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        subId,
        hostel.id,
        'HostelOS Professional',
        999.00,
        18.00,
        179.82,
        1178.82,
        startDate,
        nextBillingDate,
        nextBillingDate,
        'trialing',
        'monthly'
      ]);
      console.log(`✅ Created trial subscription for: ${hostel.hostel_name} (ID: ${hostel.id})`);
      count++;
    }

    console.log(`🎉 Successfully created ${count} missing subscriptions!`);
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await client.end();
  }
}

runFix();
