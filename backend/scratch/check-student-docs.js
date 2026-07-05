require('dotenv').config();
const db = require('../config/db');

async function checkStudentDocs() {
  console.log('Querying student document URLs...');
  try {
    const { rows } = await db.query(
      'SELECT id, full_name, profile_photo_url, aadhaar_front_url, aadhaar_back_url, college_id_url FROM students'
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  db.end();
}

checkStudentDocs();
