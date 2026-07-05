require('dotenv').config();
const db = require('../config/db');

async function check() {
  console.log('Database diagnostic started...');
  try {
    const tables = ['users', 'hostel_owners', 'hostels', 'students', 'complaints', 'fees', 'rooms', 'beds'];
    for (const table of tables) {
      try {
        const { rows } = await db.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`Table ${table} exists, row count: ${rows[0].count}`);
      } catch (e) {
        console.log(`Table ${table} error/not exists:`, e.message);
      }
    }

    console.log('\n--- 5 Sample Users ---');
    try {
      const { rows } = await db.query(`SELECT id, email, role, created_at FROM users LIMIT 5`);
      console.table(rows);
    } catch (e) { console.error(e); }

    console.log('\n--- 5 Sample Students ---');
    try {
      const { rows } = await db.query(`SELECT id, user_id, full_name, hostel_id, room_id, bed_id FROM students LIMIT 5`);
      console.table(rows);
    } catch (e) { console.error(e); }

    console.log('\n--- 5 Sample Hostels ---');
    try {
      const { rows } = await db.query(`SELECT id, owner_id, hostel_name, hostel_code FROM hostels LIMIT 5`);
      console.table(rows);
    } catch (e) { console.error(e); }

    console.log('\n--- 5 Sample Complaints ---');
    try {
      const { rows } = await db.query(`SELECT id, hostel_id, student_id, title, status FROM complaints LIMIT 5`);
      console.table(rows);
    } catch (e) { console.error(e); }

    console.log('\n--- 5 Sample Fees ---');
    try {
      const { rows } = await db.query(`SELECT id, hostel_id, student_id, amount, due_amount, status FROM fees LIMIT 5`);
      console.table(rows);
    } catch (e) { console.error(e); }

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    db.end();
  }
}

check();
