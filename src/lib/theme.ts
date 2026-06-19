import { secureStorage } from './secure-storage';
import { isNative } from './capacitor';

export type ThemeMode = 'light';

export const themeManager = {
  async getTheme(): Promise<ThemeMode> {
    return 'light';
  },

  async setTheme(_theme: ThemeMode): Promise<void> {
    await secureStorage.setSecure('theme_mode', 'light');
    await this.applyTheme('light');
  },

  async applyTheme(_theme: ThemeMode): Promise<void> {
    // Force light mode only
    const root = window.document.documentElement;
    root.classList.remove('dark');

    // Update Status Bar to light style if running on a native device
    if (isNative()) {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({
          style: Style.Light
        });
        await StatusBar.setBackgroundColor({
          color: '#ffffff'
        });
      } catch (e) {
        console.warn('Native StatusBar styling failed', e);
      }
    }
  },

  initThemeListener(): void {
    // No-op to disable dark-mode listeners
  }
};

