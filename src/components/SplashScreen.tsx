import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2000); // 2s duration matches Capacitor config

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
          <ShieldCheck className="h-10 w-10 text-white animate-pulse" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-wider">HostelOS</h1>
          <p className="text-sm font-semibold text-blue-100 uppercase tracking-widest mt-1">Smart Management</p>
        </div>
      </div>
    </div>
  );
};
