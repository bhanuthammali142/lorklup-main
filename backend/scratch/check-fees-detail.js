require('dotenv').config();
const db = require('../config/db');

async function checkFees() {
  console.log('Querying all fees...');
  try {
    const { rows } = await db.query('SELECT * FROM fees');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  db.end();
}

checkFees();
