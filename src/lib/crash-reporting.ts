import { isNative } from './capacitor';

export const crashReporter = {
  initialize() {
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(event.reason || new Error('Unhandled promise rejection'));
    });
  },

  reportError(error: Error, extraInfo?: any) {
    console.error('[CrashReporter] Captured Error:', error.message, error.stack);
    
    if (isNative()) {
      console.log('[CrashReporter] Native device context:', {
        platform: window.navigator.platform,
        userAgent: window.navigator.userAgent,
        extraInfo
      });
    }
  }
};
