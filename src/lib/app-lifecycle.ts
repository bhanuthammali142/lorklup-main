import { App } from '@capacitor/app';
import { isNative } from './capacitor';

export function setupAppLifecycle(
  onAppForeground: () => void,
  onAppBackground: () => void,
  onBackButton: () => void,
  onDeepLink: (url: string) => void
) {
  if (!isNative()) return;

  // App state listener (foreground / background)
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      onAppForeground();
    } else {
      onAppBackground();
    }
  });

  // Hardware Back Button listener (Android)
  App.addListener('backButton', () => {
    onBackButton();
  });

  // Deep Link url open listener
  App.addListener('appUrlOpen', (data) => {
    onDeepLink(data.url);
  });
}
