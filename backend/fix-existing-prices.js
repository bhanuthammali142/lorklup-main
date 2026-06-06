const { Client } = require('pg');
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

    console.log('Updating existing monthly subscriptions with old price (2999.00)...');
    
    const result = await client.query(`
      UPDATE subscriptions
      SET plan_price = 999.00,
          gst_amount = 179.82,
          total_amount = 1178.82
      WHERE plan_price = 2999.00 AND (billing_cycle = 'monthly' OR billing_cycle IS NULL)
    `);

    console.log(`✅ Successfully updated ${result.rowCount} legacy monthly subscriptions in the database!`);
  } catch (error) {
    console.error('❌ Legacy pricing fix failed:', error);
  } finally {
    await client.end();
  }
}

runFix();
