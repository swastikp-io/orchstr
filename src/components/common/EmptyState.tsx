import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-base font-semibold text-zinc-200 mb-1">{title}</h3>
    <p className="text-sm text-zinc-400 max-w-md mb-6">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);
