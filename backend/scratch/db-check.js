require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/db');

async function runCheck() {
  try {
    console.log('--- USERS ---');
    const { rows: users } = await db.query('SELECT id, email, role, is_active FROM users ORDER BY id DESC LIMIT 50');
    console.table(users);

    console.log('--- STUDENTS ---');
    const { rows: students } = await db.query('SELECT id, user_id, full_name, email, phone, hostel_id, is_active FROM students ORDER BY id DESC LIMIT 50');
    console.table(students);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    db.end();
  }
}

runCheck();
