import React, { useState } from 'react';
import { X, GitCommit } from 'lucide-react';

interface NewDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    context: string;
    rationale: string;
    status: 'proposed' | 'accepted';
    decided_by: string;
  }) => Promise<void>;
}

export const NewDecisionModal: React.FC<NewDecisionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [rationale, setRationale] = useState('');
  const [status, setStatus] = useState<'proposed' | 'accepted'>('accepted');
  const [decidedBy, setDecidedBy] = useState('Founder / CEO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !context || !rationale) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title,
        context,
        rationale,
        status,
        decided_by: decidedBy
      });
      setTitle('');
      setContext('');
      setRationale('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-[#0c0c10] shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Record Strategic Decision</h3>
              <p className="text-xs text-zinc-400">Log architectural, commercial, or positioning decisions.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Decision Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Standardize on Human-in-the-Loop Approval Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Decision Context *</label>
            <textarea
              required
              rows={2}
              placeholder="What problem or opportunity prompted this decision?"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Rationale & Impact *</label>
            <textarea
              required
              rows={2}
              placeholder="Why was this option chosen over alternatives?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Decided By</label>
              <select
                value={decidedBy}
                onChange={(e) => setDecidedBy(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Founder / CEO">Founder / CEO</option>
                <option value="Strategy Manager">Strategy Manager</option>
                <option value="Research Manager">Research Manager</option>
                <option value="Growth Manager">Growth Manager</option>
                <option value="Product Manager">Product Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="accepted">Accepted</option>
                <option value="proposed">Proposed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
