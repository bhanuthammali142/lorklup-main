require('dotenv').config();
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const tenantGuard = require('../middleware/tenantGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');

const JWT_SECRET = process.env.JWT_SECRET;

async function testMiddlewares() {
  console.log('Testing middlewares for student fees endpoint...');
  try {
    const token = jwt.sign({ id: 12, email: 'bhanuthammali2601@gmail.com', role: 'student', token_version: 1 }, JWT_SECRET);

    // Mock request for fee endpoint
    const req = {
      headers: { authorization: `Bearer ${token}` },
      query: {},
      params: { studentId: '3afbdf89-4823-4b2c-bfe1-e2eac6b9ce71' },
      method: 'GET',
      originalUrl: '/api/fees/student/3afbdf89-4823-4b2c-bfe1-e2eac6b9ce71'
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };

    const { verifyToken } = require('../middleware/auth');
    
    // Run verifyToken
    await verifyToken(req, res, () => {});
    
    // Run tenantGuard
    await tenantGuard(req, res, () => {});
    if (res.jsonData) {
      console.log('tenantGuard blocked with:', res.jsonData);
      return;
    }

    // Run subscriptionGuard
    await subscriptionGuard(req, res, () => {});
    if (res.jsonData) {
      console.log('subscriptionGuard blocked with:', res.jsonData);
      return;
    }

    console.log('Middlewares passed! Executing getStudentFees controller...');
    
    const { getStudentFees } = require('../controllers/feeController');
    await getStudentFees(req, res);
    console.log('Controller response:', res.jsonData);

  } catch (err) {
    console.error(err);
  } finally {
    db.end();
  }
}

testMiddlewares();
