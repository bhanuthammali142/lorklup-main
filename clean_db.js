// clean_db.js
// Utility script to clear all test data from the database while keeping the Super Admin account active.
// Run this script from the project root: node clean_db.js

const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in backend/.env!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanDatabase() {
  console.log('🔄 Connecting to database to clear test data...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete all beds, rooms, and hostels
    console.log('🧹 Clearing hostels, rooms, and beds...');
    await client.query('DELETE FROM beds');
    await client.query('DELETE FROM rooms');
    await client.query('DELETE FROM hostels');

    // 2. Delete all students and their documents
    console.log('🧹 Clearing students...');
    await client.query('DELETE FROM students');

    // 3. Delete all hostel owners
    console.log('🧹 Clearing hostel owners...');
    await client.query('DELETE FROM hostel_owners');

    // 4. Delete all user accounts except the Super Admin
    console.log('🧹 Clearing user logins (except Super Admin)...');
    const { rows: superAdmins } = await client.query("SELECT email FROM users WHERE role = 'super_admin'");
    console.log('👑 Super Admins to keep:', superAdmins.map(u => u.email).join(', '));
    
    await client.query("DELETE FROM users WHERE role != 'super_admin'");

    await client.query('COMMIT');
    console.log('✅ Database test data cleared successfully! You can now register new hostels with any emails.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clean database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
