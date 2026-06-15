import { isNative } from './capacitor';

export const otaUpdates = {
  async checkForUpdates() {
    if (!isNative()) return;

    try {
      console.log('[OTA] Checking for over-the-air updates...');
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      
      // Notify updater to sync latest bundle
      const result = await CapacitorUpdater.notifyAppReady();
      console.log('[OTA] App registered as ready. Status:', result);
    } catch (e) {
      console.error('[OTA] Update check failed:', e);
    }
  }
};
