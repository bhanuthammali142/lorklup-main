import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import type { ConnectionStatus } from '@capacitor/network';
import { isNative } from './capacitor';

export function useNetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: navigator.onLine,
    connectionType: 'unknown'
  });

  useEffect(() => {
    let handler: any;

    if (isNative()) {
      // Get initial status
      Network.getStatus().then(setStatus);

      // Listen for network changes
      Network.addListener('networkStatusChange', (status) => {
        setStatus(status);
      }).then(h => {
        handler = h;
      });
    } else {
      const handleOnline = () => setStatus({ connected: true, connectionType: 'wifi' });
      const handleOffline = () => setStatus({ connected: false, connectionType: 'none' });

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, []);

  return status;
}
