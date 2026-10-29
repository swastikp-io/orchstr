import React, { useState } from 'react';
import { X, Building2, Sparkles } from 'lucide-react';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    industry: string;
    vision: string;
    brief: string;
    target_customer: string;
    value_prop: string;
    assumptions?: Array<{ statement: string; confidence: 'low' | 'medium' | 'high'; category: 'market' | 'product' | 'customer' | 'growth' }>;
  }) => Promise<void>;
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [vision, setVision] = useState('');
  const [brief, setBrief] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [valueProp, setValueProp] = useState('');
  const [assumption1, setAssumption1] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brief || !targetCustomer || !valueProp) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({
        name,
        industry: industry || 'Software / AI',
        vision: vision || `To pioneer automated solutions in ${industry || 'software'}.`,
        brief,
        target_customer: targetCustomer,
        value_prop: valueProp,
        assumptions: assumption1 ? [
          { statement: assumption1, confidence: 'medium', category: 'market' }
        ] : []
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-zinc-800 bg-[#0c0c10] shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Create Company Workspace</h3>
              <p className="text-xs text-zinc-400">Initialize a new autonomous operating environment from a startup idea.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Synapse Security"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Industry Vertical *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cybersecurity, BioTech"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Company Vision</label>
            <input
              type="text"
              placeholder="e.g. To eliminate cloud identity vulnerabilities before code ships."
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Canonical Company Brief *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe what the company does, the core macro problem, and how it solves it..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Target Customer *</label>
              <input
                type="text"
                required
                placeholder="e.g. CISOs at mid-market fintechs"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Value Proposition *</label>
              <input
                type="text"
                required
                placeholder="e.g. Automated CI/CD identity guardrails"
                value={valueProp}
                onChange={(e) => setValueProp(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Key Initial Hypothesis / Assumption</label>
            <input
              type="text"
              placeholder="e.g. Customers will pay $30k/yr to prevent IAM permission drift."
              value={assumption1}
              onChange={(e) => setAssumption1(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Initialize Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
