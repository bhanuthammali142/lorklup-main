require('dotenv').config();
const db = require('../config/db');

async function checkTodayLogs() {
  console.log('Checking all audit logs for today...');
  try {
    const { rows } = await db.query(
      "SELECT action, entity_id, details, created_at FROM audit_logs WHERE created_at >= '2026-07-05 00:00:00' ORDER BY created_at DESC"
    );
    rows.forEach(r => {
      const detailsObj = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
      console.log(`Time: ${r.created_at}, Action: ${r.action}, Entity: ${r.entity_id}, Details: ${JSON.stringify(detailsObj)}`);
    });
  } catch (err) {
    console.error('Failed to query audit logs:', err.message);
  }
  db.end();
}

checkTodayLogs();
