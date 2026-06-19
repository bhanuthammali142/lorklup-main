/**
 * backend/utils/googleAuth.js
 * Verifies a Google ID Token using Google's tokeninfo API.
 */
async function verifyGoogleToken(idToken) {
  if (!idToken) {
    throw new Error('Google ID Token is required');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('❌ GOOGLE_CLIENT_ID is not configured in environment variables');
    throw new Error('Server configuration error: GOOGLE_CLIENT_ID is missing');
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ Google token verification failed response:', errorText);
      throw new Error('Invalid Google ID Token');
    }

    const payload = await response.json();

    // Validate Audience
    if (payload.aud !== clientId) {
      console.warn(`⚠️ Google token audience mismatch: expected ${clientId}, got ${payload.aud}`);
      throw new Error('Token audience mismatch: Unauthorized client');
    }

    // Validate Issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      console.warn(`⚠️ Google token issuer invalid: ${payload.iss}`);
      throw new Error('Token issuer invalid');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && parseInt(payload.exp, 10) < now) {
      console.warn(`⚠️ Google token expired at ${payload.exp}, now is ${now}`);
      throw new Error('Google ID Token has expired');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      name: payload.name,
      picture: payload.picture
    };

  } catch (error) {
    console.error('❌ [verifyGoogleToken] Error verifying token:', error.message);
    throw new Error(error.message || 'Failed to verify Google ID Token');
  }
}

module.exports = { verifyGoogleToken };
