import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
    <span className="text-sm font-mono tracking-wide">{label}</span>
  </div>
);
