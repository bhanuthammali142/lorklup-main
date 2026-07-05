require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const remoteUrl = 'https://13-203-66-99.sslip.io/api';

async function testRemote() {
  console.log('Generating token for user 12...');
  const token = jwt.sign({ id: 12, email: 'bhanuthammali2601@gmail.com', role: 'student', token_version: 1 }, JWT_SECRET);
  
  console.log('Sending request to complaints endpoint...');
  try {
    const res = await fetch(`${remoteUrl}/complaints?hostel_id=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Complaints Status:', res.status);
    const text = await res.text();
    console.log('Complaints Body:', text);
  } catch (e) {
    console.error('Complaints request failed:', e.message);
  }

  console.log('\nSending request to student fees endpoint...');
  try {
    const res = await fetch(`${remoteUrl}/fees/student/3afbdf89-4823-4b2c-bfe1-e2eac6b9ce71`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Fees Status:', res.status);
    const text = await res.text();
    console.log('Fees Body:', text);
  } catch (e) {
    console.error('Fees request failed:', e.message);
  }
}

testRemote();
