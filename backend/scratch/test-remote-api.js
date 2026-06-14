require('dotenv').config({ path: 'backend/.env' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT Secret:', JWT_SECRET);

const payload = {
  id: 6,
  email: 'bhanuthammali147@gmail.com',
  role: 'student',
  name: 'bhanuthammali',
  hostel_id: 2
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
console.log('Generated Token:', token);

async function testRequest() {
  try {
    const res = await fetch('https://13-203-66-99.sslip.io/api/students?hostel_id=2', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Response Status:', res.status);
    const body = await res.text();
    console.log('Response Body:', body);
  } catch (err) {
    console.error('Request failed:', err);
  }
}

testRequest();
