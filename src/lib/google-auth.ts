// src/lib/google-auth.ts
/**
 * HOSTELOS GOOGLE AUTH UTILITY
 *
 * Platform-aware Google Sign-In:
 *   - Web   → Google Identity Services (GSI) via accounts.google.com/gsi/client
 *   - Android / iOS → @capgo/capacitor-social-login (native flow)
 *
 * Both paths return an ID token that is sent to /api/auth/google-login
 * to exchange for the app's JWT session token.
 */

import { Capacitor } from '@capacitor/core'

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '908126464614-vj6o254q59p0som0dtgnhp3tcaqm6j8s.apps.googleusercontent.com'

export type GoogleSignInResult = {
  idToken: string
  email?: string
  displayName?: string
}

/** Returns true if the current runtime is a native Capacitor app (Android / iOS) */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB — Google Identity Services (GSI)
// ─────────────────────────────────────────────────────────────────────────────

let gsiScriptLoaded = false
let gsiScriptLoading = false
let gsiScriptPromise: Promise<void> | null = null

/** Load the GSI script once and resolve when ready */
export function loadGsiScript(): Promise<void> {
  if (gsiScriptLoaded) return Promise.resolve()
  if (gsiScriptLoading && gsiScriptPromise) return gsiScriptPromise

  gsiScriptLoading = true
  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-gsi-script')
    if (existing) {
      gsiScriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      gsiScriptLoaded = true
      gsiScriptLoading = false
      resolve()
    }
    script.onerror = () => {
      gsiScriptLoading = false
      reject(new Error('Failed to load Google Sign-In script.'))
    }
    document.head.appendChild(script)
  })

  return gsiScriptPromise
}

/** Render the GSI button into a container element (web only) */
export async function renderGsiButton(
  containerId: string,
  onSuccess: (result: GoogleSignInResult) => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    await loadGsiScript()

    const g = (window as any).google
    if (!g) {
      onError(new Error('Google Sign-In library not loaded.'))
      return
    }

    g.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response: any) => {
        if (!response?.credential) {
          onError(new Error('Google did not return authentication credentials.'))
          return
        }
        onSuccess({ idToken: response.credential })
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      error_callback: (err: any) => {
        console.error('[GoogleAuth] GSI error:', err)
        onError(new Error(err?.message || 'Google Sign-In initialization failed.'))
      },
    })

    g.accounts.id.renderButton(document.getElementById(containerId), {
      theme: 'filled_blue',
      size: 'large',
      width: 380,
      text: 'continue_with',
      shape: 'rectangular',
    })
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIVE — @capgo/capacitor-social-login
// ─────────────────────────────────────────────────────────────────────────────

/** Initialize the native Google Auth plugin (Android / iOS) */
export async function initNativeGoogleAuth(): Promise<void> {
  try {
    const { SocialLogin } = await import('@capgo/capacitor-social-login')
    await SocialLogin.initialize({
      google: {
        webClientId: CLIENT_ID,
      },
    })
  } catch (err) {
    console.error('[GoogleAuth] Native init failed:', err)
    throw err
  }
}

/** Trigger the native Google account picker and return an ID token */
export async function nativeGoogleSignIn(): Promise<GoogleSignInResult> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')

  const loginResult = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['profile', 'email'],
    },
  })

  // The plugin returns tokens and profile under loginResult.result
  const idToken =
    (loginResult as any).result?.idToken ||
    (loginResult as any).result?.accessToken?.token

  if (!idToken) {
    throw new Error(
      'Google Sign-In succeeded but no ID token was returned. ' +
      'Ensure the Web Client ID is configured in Google Cloud Console for this Android app.'
    )
  }

  const profile = (loginResult as any).result?.profile
  return {
    idToken,
    email: profile?.email ?? undefined,
    displayName: profile?.name ?? undefined,
  }
}

/** Sign out from native Google Auth (clears the native session cache) */
export async function nativeGoogleSignOut(): Promise<void> {
  try {
    const { SocialLogin } = await import('@capgo/capacitor-social-login')
    await SocialLogin.logout({ provider: 'google' })
  } catch (err) {
    console.warn('[GoogleAuth] Native sign-out error (non-fatal):', err)
  }
}
