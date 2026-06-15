import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  permissionName: string;
  description: string;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  onClose,
  permissionName,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-4 mt-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{permissionName} Permission Needed</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full btn-premium-primary mt-2"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
