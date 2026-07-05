require('dotenv').config();
const db = require('../config/db');

async function testQuery() {
  console.log('Testing complaints query...');
  try {
    const hostelId = 1;
    const { rows: rows } = await db.query(
      `SELECT c.*, s.full_name AS student_name, r.room_number
       FROM complaints c
       LEFT JOIN students s ON s.id = c.student_id
       LEFT JOIN rooms r ON r.id = s.room_id
       WHERE c.hostel_id = $1 ORDER BY c.created_at DESC`,
      [hostelId]
    );
    console.log('Complaints query success! Count:', rows.length);
  } catch (err) {
    console.error('Complaints query failed:', err.message);
  }

  console.log('\nTesting getStudentFees queries for student_id = e9f07495-8a86-4ea4-8435-ffc6767b2a60...');
  try {
    const studentId = 'e9f07495-8a86-4ea4-8435-ffc6767b2a60';
    const { rows: rows } = await db.query(
      'SELECT * FROM fees WHERE student_id = $1 ORDER BY month DESC',
      [studentId]
    );
    console.log('Student fees query success! Count:', rows.length);
  } catch (err) {
    console.error('Student fees query failed:', err.message);
  }

  db.end();
}

testQuery();
