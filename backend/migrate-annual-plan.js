const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
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

    console.log('Altering schema for annual plan support...');

    // 1. Add billing_cycle to subscriptions table
    await client.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly' 
      CHECK (billing_cycle IN ('monthly', 'yearly'));
    `);
    console.log('✅ Added billing_cycle to subscriptions table (or already exists)');

    // 2. Add billing_cycle to payments table
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly' 
      CHECK (billing_cycle IN ('monthly', 'yearly'));
    `);
    console.log('✅ Added billing_cycle to payments table (or already exists)');

    // 3. Seed annual price setting
    await client.query(`
      INSERT INTO platform_settings (key, value) VALUES
      ('annual_price', '9999')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);
    console.log('✅ Seeded annual_price = 9999 in platform_settings');

    console.log('✅ Schema migration for annual plan executed successfully!');
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
