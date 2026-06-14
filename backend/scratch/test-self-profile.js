async function runTest() {
  try {
    console.log('Sending login request to RENDER backend...');
    const loginRes = await fetch('https://13-203-66-99.sslip.io/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'telugu@gmail.com', password: 'Bhanu@2006' })
    });
    console.log('Login status:', loginRes.status);
    const loginData = await loginRes.json();

    if (!loginData.success && !loginData.token) {
      console.error('Login failed:', loginData);
      return;
    }

    const token = loginData.token;

    console.log('\nSending /api/students/profile/me request to REMOTE backend...');
    const profileRes = await fetch('https://13-203-66-99.sslip.io/api/students/profile/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Profile status:', profileRes.status);
    const profileData = await profileRes.json();
    console.log('Profile Response:', JSON.stringify(profileData, null, 2));

  } catch (err) {
    console.error(err);
  }
}

runTest();
