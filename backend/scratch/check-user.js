require('dotenv').config();
const db = require('../config/db');

async function checkUser() {
  const email = 'bhanuthammali26012@gmail.com';
  console.log('Querying for:', email);
  try {
    const { rows } = await db.query(
      'SELECT id, email, role, is_active, google_id FROM users WHERE email = $1',
      [email]
    );
    console.log('Result for email:', rows);

    const { rows: allUsers } = await db.query('SELECT id, email, role, google_id FROM users');
    console.log('All Users in DB:');
    console.table(allUsers);
  } catch (err) {
    console.error(err);
  }
  db.end();
}

checkUser();
