import React from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../lib/network-status';

export const OfflineIndicator: React.FC = () => {
  const { connected } = useNetworkStatus();

  if (connected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
      <WifiOff className="h-4 w-4 animate-pulse" />
      <span>No Internet Connection. Running in offline/read-only mode.</span>
    </div>
  );
};
