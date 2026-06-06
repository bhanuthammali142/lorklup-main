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

    console.log('Executing database schema updates...');

    // 1. Rename student payments table to student_payments if it exists under the old name
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') 
           AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_payments') THEN
          ALTER TABLE payments RENAME TO student_payments;
          RAISE NOTICE 'Renamed payments table to student_payments';
        END IF;
      END
      $$;
    `);

    // 2. Drop old invoices/subscriptions/plans if they exist
    await client.query('DROP TABLE IF EXISTS platform_invoices CASCADE;');
    await client.query('DROP TABLE IF EXISTS subscriptions CASCADE;');
    await client.query('DROP TABLE IF EXISTS billing_plans CASCADE;');

    // 3. Create platform_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create subscriptions table
    await client.query(`
      CREATE TABLE subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
          plan_name VARCHAR(100) NOT NULL,
          plan_price DECIMAL(10,2) NOT NULL,
          gst_percentage DECIMAL(5,2) NOT NULL,
          gst_amount DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          next_billing_date TIMESTAMP,
          status VARCHAR(50) DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'expired', 'suspended', 'canceled', 'pending_payment')),
          razorpay_subscription_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create new payments table (for subscriptions)
    await client.query(`
      CREATE TABLE payments (
          id VARCHAR(36) PRIMARY KEY,
          hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
          subscription_id VARCHAR(36) REFERENCES subscriptions(id) ON DELETE CASCADE,
          payment_gateway VARCHAR(50) DEFAULT 'razorpay',
          transaction_id VARCHAR(100),
          amount DECIMAL(10,2) NOT NULL,
          gst_amount DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('paid', 'failed', 'pending')),
          payment_date TIMESTAMP,
          invoice_number VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create invoices table (for subscriptions)
    await client.query(`
      CREATE TABLE invoices (
          id VARCHAR(36) PRIMARY KEY,
          hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
          payment_id VARCHAR(36) REFERENCES payments(id) ON DELETE CASCADE,
          invoice_number VARCHAR(100) UNIQUE NOT NULL,
          invoice_pdf_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Seed initial settings
    await client.query(`
      INSERT INTO platform_settings (key, value) VALUES
      ('monthly_price', '999'),
      ('gst_percentage', '18'),
      ('trial_period_days', '7'),
      ('grace_period_days', '5'),
      ('auto_renew_enabled', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);

    console.log('✅ Migration executed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
