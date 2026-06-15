import { Preferences } from '@capacitor/preferences';
import { isNative } from './capacitor';

export const secureStorage = {
  async getSecure(key: string): Promise<string | null> {
    if (isNative()) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch (e) {
        console.error('Error reading from Preferences', e);
        return localStorage.getItem(key);
      }
    } else {
      return localStorage.getItem(key);
    }
  },

  async setSecure(key: string, value: string): Promise<void> {
    if (isNative()) {
      try {
        await Preferences.set({ key, value });
      } catch (e) {
        console.error('Error writing to Preferences', e);
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removeSecure(key: string): Promise<void> {
    if (isNative()) {
      try {
        await Preferences.remove({ key });
      } catch (e) {
        console.error('Error removing from Preferences', e);
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (isNative()) {
      try {
        await Preferences.clear();
      } catch (e) {
        console.error('Error clearing Preferences', e);
        localStorage.clear();
      }
    } else {
      localStorage.clear();
    }
  }
};
