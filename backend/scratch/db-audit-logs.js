require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/db');

async function runCheck() {
  try {
    console.log('--- RECENT AUDIT LOGS ---');
    const { rows: logs } = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 30');
    console.table(logs);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    db.end();
  }
}

runCheck();
