import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from './capacitor';
import { secureStorage } from './secure-storage';

export async function setupPushNotifications(
  onNotificationClick: (data: any) => void
): Promise<() => void> {
  if (!isNative()) {
    console.log('[PushNotifications] Non-native platform, skipping registration');
    return () => {};
  }

  const handles: any[] = [];

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      console.warn('[PushNotifications] Permission not granted:', perm.receive);
      return () => {};
    }

    // Register with FCM/APNS
    await PushNotifications.register();

    // Registration succeeded callback
    const hReg = await PushNotifications.addListener('registration', async ({ value: token }) => {
      console.log('[PushNotifications] Registration succeeded, token:', token);
      await secureStorage.setSecure('device_token', token);
      
      // Attempt to register device token with backend
      try {
        const { default: axios } = await import('axios');
        const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const authToken = await secureStorage.getSecure('hostelOS_token');
        
        if (authToken) {
          await axios.post(
            `${envApiUrl}/auth/device-token`,
            { token, platform: window.navigator.platform },
            { headers: { Authorization: `Bearer ${authToken}` } }
          );
          console.log('[PushNotifications] Token registered with backend');
        }
      } catch (e) {
        console.warn('[PushNotifications] Failed to send token to backend (normal if endpoint is not implemented yet):', e);
      }
    });
    handles.push(hReg);

    // Registration error callback
    const hErr = await PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotifications] Registration error:', error);
    });
    handles.push(hErr);

    // Received in foreground
    const hRec = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PushNotifications] Received in foreground:', notification);
    });
    handles.push(hRec);

    // Clicked by user
    const hAct = await PushNotifications.addListener('pushNotificationActionPerformed', ({ actionId, notification }) => {
      console.log('[PushNotifications] Action performed:', actionId, notification);
      if (notification.data) {
        onNotificationClick(notification.data);
      }
    });
    handles.push(hAct);

  } catch (err) {
    console.error('[PushNotifications] Failed to setup push notifications:', err);
  }

  return () => {
    handles.forEach(h => {
      if (h && typeof h.remove === 'function') {
        h.remove();
      }
    });
  };
}
