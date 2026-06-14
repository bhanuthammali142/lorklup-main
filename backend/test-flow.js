require('dotenv').config({ path: 'backend/.env' });

const db = require('./config/db');
const subscriptionGuard = require('./middleware/subscriptionGuard');
const tenantGuard = require('./middleware/tenantGuard');

// Mock request and response objects
async function runDiagnostic() {
  const req = {
    headers: {},
    query: {},
    body: {},
    params: {},
    method: 'GET',
    originalUrl: '/api/billing/my-subscription',
    // Mock decoded user info (initially without hostel_id to test dynamic resolution)
    user: {
      id: 7,
      email: 'bhanuthammali1421@gmail.com',
      role: 'admin',
      hostel_id: null
    }
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

  console.log('🔄 STEP 1: Running verifyToken logic mock...');
  try {
    // Dynamically resolve hostel_id from database
    let dbHostelId = null;
    if (req.user.role === 'admin') {
      const { rows: hostelRows } = await db.query(
        'SELECT h.id AS hostel_id FROM hostels h JOIN hostel_owners ho ON ho.id = h.owner_id WHERE ho.user_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (hostelRows.length > 0) {
        dbHostelId = hostelRows[0].hostel_id;
      }
    }
    req.user.hostel_id = dbHostelId;
    console.log('Resolved hostel_id:', req.user.hostel_id);
  } catch (err) {
    console.error('❌ verifyToken mock failed:', err);
  }

  console.log('🔄 STEP 2: Running tenantGuard...');
  try {
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    await tenantGuard(req, res, next);
    console.log('tenantGuard next called:', nextCalled);
    if (res.jsonData) {
      console.log('tenantGuard returned error response:', res.jsonData);
      return;
    }
  } catch (err) {
    console.error('❌ tenantGuard failed:', err);
    return;
  }

  console.log('🔄 STEP 3: Running subscriptionGuard...');
  try {
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    await subscriptionGuard(req, res, next);
    console.log('subscriptionGuard next called:', nextCalled);
    console.log('req.subscription payload:', req.subscription);
    if (res.jsonData) {
      console.log('subscriptionGuard returned error response:', res.jsonData);
      return;
    }
  } catch (err) {
    console.error('❌ subscriptionGuard failed:', err);
    return;
  }

  console.log('🔄 STEP 4: Running getMySubscription controller...');
  try {
    const { rows: payments } = await db.query(
      'SELECT * FROM payments WHERE hostel_id = $1 ORDER BY created_at DESC',
      [req.user.hostel_id]
    );

    const { rows: invoices } = await db.query(
      'SELECT * FROM invoices WHERE hostel_id = $1 ORDER BY created_at DESC',
      [req.user.hostel_id]
    );

    const responseData = {
      success: true,
      data: {
        subscription: req.subscription,
        payments,
        invoices
      }
    };
    console.log('🚀 Success! getMySubscription response data:', JSON.stringify(responseData, null, 2));
  } catch (err) {
    console.error('❌ getMySubscription failed:', err);
  }
}

runDiagnostic().then(() => {
  db.end();
});
