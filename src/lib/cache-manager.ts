import { secureStorage } from './secure-storage';

export const cacheManager = {
  async getCache<T>(key: string): Promise<T | null> {
    const raw = await secureStorage.getSecure(`cache_${key}`);
    if (!raw) return null;
    try {
      const { data, expiry } = JSON.parse(raw);
      if (expiry && expiry < Date.now()) {
        await this.clearCache(key);
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  },

  async setCache<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    const payload = {
      data,
      expiry: ttlMs ? Date.now() + ttlMs : null
    };
    await secureStorage.setSecure(`cache_${key}`, JSON.stringify(payload));
  },

  async clearCache(key: string): Promise<void> {
    await secureStorage.removeSecure(`cache_${key}`);
  }
};
