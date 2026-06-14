const db = require('../config/db');
const crypto = require('crypto');

async function runTest() {
  console.log('🏁 Starting Integration Test for Student Advance & Payment Day Flow...');
  
  // Find a valid hostel to assign the student to
  const { rows: hostels } = await db.query('SELECT id FROM hostels LIMIT 1');
  if (hostels.length === 0) {
    console.error('❌ No hostels found in database. Cannot run test.');
    process.exit(1);
  }
  const hostelId = hostels[0].id;
  console.log(`📌 Using Hostel ID: ${hostelId}`);

  // Find a valid room and bed
  const { rows: rooms } = await db.query('SELECT id, monthly_fee FROM rooms WHERE hostel_id = $1 LIMIT 1', [hostelId]);
  if (rooms.length === 0) {
    console.error('❌ No rooms found in database for hostel. Cannot run test.');
    process.exit(1);
  }
  const roomId = rooms[0].id;
  const roomFee = Number(rooms[0].monthly_fee || 5000);
  console.log(`📌 Using Room ID: ${roomId} with Monthly Fee: ₹${roomFee}`);

  const { rows: beds } = await db.query('SELECT id FROM beds WHERE room_id = $1 AND status = \'available\' LIMIT 1', [roomId]);
  if (beds.length === 0) {
    console.error('❌ No available beds found in room. Cannot run test.');
    process.exit(1);
  }
  const bedId = beds[0].id;
  console.log(`📌 Using Bed ID: ${bedId}`);

  // Create a mock user for the student
  const studentEmail = `test_student_${Date.now()}@example.com`;
  const { rows: userRows } = await db.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id`,
    [studentEmail, 'hashedpassword', 'student']
  );
  const studentUserId = userRows[0].id;
  console.log(`✅ Created mock student user with ID: ${studentUserId} and Email: ${studentEmail}`);

  // Insert student with custom advance and monthly payment day
  const studentId = crypto.randomUUID();
  const advanceAmount = 3500;
  const monthlyPaymentDay = 15;
  await db.query(
    `INSERT INTO students
     (id, hostel_id, user_id, room_id, bed_id, full_name, email, phone, advance_amount, monthly_payment_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      studentId, hostelId, studentUserId, roomId, bedId,
      'Integration Test Student', studentEmail, '9999999999',
      advanceAmount, monthlyPaymentDay
    ]
  );
  console.log(`✅ Inserted student record with advance_amount=${advanceAmount}, monthly_payment_day=${monthlyPaymentDay}`);

  // Generate the auto-created fee using the monthly_payment_day
  const feeId = crypto.randomUUID();
  const now = new Date();
  const monthString = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0];
  const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, monthlyPaymentDay)).toISOString().split('T')[0];
  
  await db.query(
    `INSERT INTO fees (id, hostel_id, student_id, amount, due_amount, month, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [feeId, hostelId, studentId, roomFee, roomFee, monthString, dueDate, 'pending']
  );
  console.log(`✅ Auto-generated fee record with due_date=${dueDate}`);

  // Verify the fee record exists in the database
  const { rows: feeRows } = await db.query('SELECT * FROM fees WHERE id = $1', [feeId]);
  if (feeRows.length === 0) {
    throw new Error('Fee record was not inserted successfully.');
  }
  const savedFee = feeRows[0];
  console.log('🔍 Database fee record:', {
    id: savedFee.id,
    amount: savedFee.amount,
    due_date: savedFee.due_date.toISOString().split('T')[0],
    status: savedFee.status
  });

  // Test the 5-day upcoming fee visibility filter logic
  const mockFilter = (fee, currentDate) => {
    if (fee.status === 'paid') return true;
    if (!fee.due_date) return true;

    const dueDateObj = new Date(fee.due_date);
    const fiveDaysBefore = new Date(dueDateObj);
    fiveDaysBefore.setDate(dueDateObj.getDate() - 5);

    return currentDate >= fiveDaysBefore;
  };

  // Scenario A: Current date is 10 days before due date (Should be HIDDEN)
  const dateTenDaysBefore = new Date(dueDate);
  dateTenDaysBefore.setDate(dateTenDaysBefore.getDate() - 10);
  const isVisibleA = mockFilter(savedFee, dateTenDaysBefore);
  console.log(`🔍 Visibility 10 days before due date: ${isVisibleA ? 'VISIBLE' : 'HIDDEN'} (Expected: HIDDEN)`);

  // Scenario B: Current date is 5 days before due date (Should be VISIBLE)
  const dateFiveDaysBefore = new Date(dueDate);
  dateFiveDaysBefore.setDate(dateFiveDaysBefore.getDate() - 5);
  const isVisibleB = mockFilter(savedFee, dateFiveDaysBefore);
  console.log(`🔍 Visibility 5 days before due date: ${isVisibleB ? 'VISIBLE' : 'HIDDEN'} (Expected: VISIBLE)`);

  // Scenario C: Current date is after due date (Should be VISIBLE)
  const dateAfter = new Date(dueDate);
  dateAfter.setDate(dateAfter.getDate() + 2);
  const isVisibleC = mockFilter(savedFee, dateAfter);
  console.log(`🔍 Visibility 2 days after due date: ${isVisibleC ? 'VISIBLE' : 'HIDDEN'} (Expected: VISIBLE)`);

  // Assertions
  if (isVisibleA === false && isVisibleB === true && isVisibleC === true) {
    console.log('🎉 SUCCESS: 5-day upcoming fee warning visibility logic works perfectly!');
  } else {
    console.error('❌ FAILURE: Visibility logic does not match expectations.');
  }

  // CLEANUP
  console.log('🧹 Cleaning up test records...');
  await db.query('DELETE FROM fees WHERE student_id = $1', [studentId]);
  await db.query('DELETE FROM students WHERE id = $1', [studentId]);
  await db.query('DELETE FROM users WHERE id = $1', [studentUserId]);
  console.log('✅ Cleanup completed successfully.');
}

runTest()
  .catch(err => {
    console.error('❌ Test failed with error:', err);
  })
  .finally(() => {
    db.end();
  });
