import { isNative } from './capacitor';

export const analytics = {
  logEvent(name: string, params?: Record<string, any>) {
    console.log(`[Analytics] Event logged: "${name}"`, params || '');
    
    if (isNative()) {
      // Integration hook for Firebase Analytics, Mixpanel, etc.
    }
  },

  logScreenView(screenName: string) {
    console.log(`[Analytics] Screen view logged: "${screenName}"`);
    
    if (isNative()) {
      // Screen view event hook
    }
  }
};
