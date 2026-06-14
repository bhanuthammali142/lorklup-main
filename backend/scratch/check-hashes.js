require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/db');

async function runCheck() {
  try {
    const { rows } = await db.query('SELECT id, email, password, role, is_active FROM users WHERE role = \'student\'');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    db.end();
  }
}

runCheck();
