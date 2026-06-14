async function runTest() {
  try {
    console.log('Sending login request...');
    const loginRes = await fetch('https://13-203-66-99.sslip.io/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'telugu@gmail.com', password: 'Bhanu@2006' })
    });
    console.log('Login status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('Login failed!');
      return;
    }

    const { token } = loginData;

    console.log('\nSending /api/auth/me request...');
    const meRes = await fetch('https://13-203-66-99.sslip.io/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Me status:', meRes.status);
    const meData = await meRes.json();
    console.log('Me Response:', JSON.stringify(meData, null, 2));

    console.log('\nSending /api/students?hostel_id=... request...');
    const studentsRes = await fetch(`https://13-203-66-99.sslip.io/api/students?hostel_id=${meData.hostel_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Students status:', studentsRes.status);
    const studentsData = await studentsRes.json();
    console.log('Students Response:', JSON.stringify(studentsData, null, 2));

  } catch (err) {
    console.error(err);
  }
}

runTest();
