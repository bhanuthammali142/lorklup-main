import { secureStorage } from './secure-storage';
import { isNative } from './capacitor';

export type ThemeMode = 'light' | 'dark' | 'system';

export const themeManager = {
  async getTheme(): Promise<ThemeMode> {
    const saved = await secureStorage.getSecure('theme_mode');
    return (saved as ThemeMode) || 'system';
  },

  async setTheme(theme: ThemeMode): Promise<void> {
    await secureStorage.setSecure('theme_mode', theme);
    await this.applyTheme(theme);
  },

  async applyTheme(theme: ThemeMode): Promise<void> {
    let isDark = false;

    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }

    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update Status Bar if native
    if (isNative()) {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light
        });
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0b0f19' : '#ffffff'
        });
      } catch (e) {
        console.warn('Native StatusBar styling failed', e);
      }
    }
  },

  initThemeListener(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
      const current = await this.getTheme();
      if (current === 'system') {
        this.applyTheme('system');
      }
    });
  }
};
