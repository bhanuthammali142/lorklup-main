require('dotenv').config();
const db = require('../config/db');

async function testSubscription() {
  console.log('Checking subscriptions...');
  try {
    const { rows } = await db.query('SELECT * FROM subscriptions');
    console.table(rows);
  } catch (err) {
    console.error('Failed to select subscriptions:', err.message);
  }
  db.end();
}

testSubscription();
