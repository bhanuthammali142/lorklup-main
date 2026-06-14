require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/db');

async function runCheck() {
  try {
    console.log('--- HOSTELS ---');
    const { rows: hostels } = await db.query('SELECT id, hostel_name, is_active FROM hostels');
    console.table(hostels);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    db.end();
  }
}

runCheck();
