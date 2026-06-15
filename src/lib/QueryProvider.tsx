import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useNetworkStatus } from './network-status';
import { offlineQueue } from './offline-queue';
import { getToken } from './api-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes stale time for mobile performance
    },
  },
});

function OfflineSyncHandler() {
  const { connected } = useNetworkStatus();

  useEffect(() => {
    if (connected) {
      const token = getToken();
      offlineQueue.processQueue(token || undefined);
    }
  }, [connected]);

  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineSyncHandler />
      {children}
    </QueryClientProvider>
  );
}
