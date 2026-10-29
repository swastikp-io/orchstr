import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => (
  <div className="flex items-center justify-between p-4 mb-6 rounded-lg bg-red-950/40 border border-red-900/60 text-red-200">
    <div className="flex items-center space-x-3">
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
    {onDismiss && (
      <button onClick={onDismiss} className="text-red-400 hover:text-red-300 p-1">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);
