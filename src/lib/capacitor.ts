// src/lib/capacitor.ts
/**
 * HOSTELOS CAPACITOR INTEGRATION — Exposes unified wrappers for native plugins with automated web fallbacks.
 */

import { Capacitor } from '@capacitor/core'

// Simple helper to check if running in a Capacitor native app wrapper
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web'
}

export function isAndroid(): boolean {
  return getPlatform() === 'android'
}

export function isIOS(): boolean {
  return getPlatform() === 'ios'
}

// ── Native Haptics ──────────────────────────────────────────────────────────
export async function triggerHaptic() {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (e) {
      console.warn('Native Haptics failed to run', e)
    }
  } else if (navigator.vibrate) {
    navigator.vibrate(15) // Web Vibe API fallback
  }
}

// ── Native Share sheet ────────────────────────────────────────────────────────
export async function shareContent(title: string, text: string, url?: string) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: 'Share with' })
      return true
    } catch (e) {
      console.error('Native Share sheet failed', e)
      return false
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      return false
    }
  } else {
    // Copy URL to clipboard fallback
    try {
      await navigator.clipboard.writeText(url || text)
      return 'copied'
    } catch {
      return false
    }
  }
}

// ── Native Push notifications registration ────────────────────────────────────
export async function registerPushNotifications() {
  if (!isNative()) return null
  
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
    }
    
    if (perm.receive === 'granted') {
      await PushNotifications.register()
      return true
    }
    return false
  } catch (e) {
    console.error('Push notification setup failed', e)
    return false
  }
}

// ── Native Camera Capture Helper ──────────────────────────────────────────────
export async function capturePhoto() {
  if (isNative()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      })
      return image.webPath // path suitable for rendering in <img src="..." />
    } catch (e) {
      console.error('Native camera capture failed', e)
      throw e
    }
  }
  throw new Error('Native camera not available on web platform')
}

// ── Native Gallery Pick Helper ──────────────────────────────────────────────
export async function pickPhotoFromGallery() {
  if (isNative()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      })
      return image.webPath // path suitable for rendering in <img src="..." />
    } catch (e) {
      console.error('Native gallery pick failed', e)
      throw e
    }
  }
  throw new Error('Native gallery not available on web platform')
}
