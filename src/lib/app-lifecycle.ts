import { App } from '@capacitor/app';
import { isNative } from './capacitor';

export function setupAppLifecycle(
  onAppForeground: () => void,
  onAppBackground: () => void,
  onBackButton: () => void,
  onDeepLink: (url: string) => void
) {
  if (!isNative()) return () => {};

  const handles: any[] = [];

  // App state listener (foreground / background)
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      onAppForeground();
    } else {
      onAppBackground();
    }
  }).then(h => handles.push(h));

  // Hardware Back Button listener (Android)
  App.addListener('backButton', () => {
    onBackButton();
  }).then(h => handles.push(h));

  // Deep Link url open listener
  App.addListener('appUrlOpen', (data) => {
    onDeepLink(data.url);
  }).then(h => handles.push(h));

  return () => {
    handles.forEach(h => {
      if (h && typeof h.remove === 'function') {
        h.remove();
      }
    });
  };
}
