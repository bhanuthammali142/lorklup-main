require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/db');

async function resetPassword() {
  try {
    await db.query("UPDATE users SET password = 'Bhanu@2006' WHERE email = 'ok@gmail.com'");
    console.log('Password reset successfully for ok@gmail.com');
  } catch (err) {
    console.error(err);
  } finally {
    db.end();
  }
}

resetPassword();
