require('dotenv').config();
const db = require('../config/db');

async function checkLogs() {
  console.log('Checking login failure audit logs details...');
  try {
    const { rows } = await db.query(
      "SELECT action, entity_id, details, created_at FROM audit_logs WHERE action = 'LOGIN_FAILURE' ORDER BY created_at DESC LIMIT 10"
    );
    rows.forEach(r => {
      const detailsObj = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
      console.log(`Time: ${r.created_at}, Email: ${r.entity_id}, Reason: ${detailsObj.reason || detailsObj.error || JSON.stringify(detailsObj)}`);
    });
  } catch (err) {
    console.error('Failed to query audit logs:', err.message);
  }
  db.end();
}

checkLogs();
