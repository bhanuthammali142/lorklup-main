require('dotenv').config();
const db = require('../config/db');

async function testAttendance() {
  console.log('Checking attendance table...');
  try {
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM attendance');
    console.log('Attendance row count:', countRows[0].count);

    const { rows } = await db.query('SELECT * FROM attendance LIMIT 10');
    console.table(rows);
  } catch (err) {
    console.error('Failed to select attendance:', err.message);
  }
  db.end();
}

testAttendance();
