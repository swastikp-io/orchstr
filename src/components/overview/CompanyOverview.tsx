import React, { useState } from 'react';
import { Company, CompanyContext, Decision, Task, Artifact, ApprovalRequest } from '../../types';
import {
  Sparkles,
  Target,
  ShieldAlert,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface CompanyOverviewProps {
  company: Company;
  context: CompanyContext;
  decisions: Decision[];
  tasks: Task[];
  artifacts: Artifact[];
  approvals: ApprovalRequest[];
  onUpdateContext: (updates: Partial<CompanyContext>) => Promise<void>;
  onOpenNewDecisionModal: () => void;
}

export const CompanyOverview: React.FC<CompanyOverviewProps> = ({
  company,
  context,
  decisions,
  tasks,
  artifacts,
  approvals,
  onUpdateContext,
  onOpenNewDecisionModal
}) => {
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefText, setBriefText] = useState(context.brief);
  const [targetCustomer, setTargetCustomer] = useState(context.target_customer);
  const [valueProp, setValueProp] = useState(context.value_prop);
  const [isSaving, setIsSaving] = useState(false);

  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

  const handleSaveBrief = async () => {
    setIsSaving(true);
    try {
      await onUpdateContext({
        brief: briefText,
        target_customer: targetCustomer,
        value_prop: valueProp
      });
      setIsEditingBrief(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero / Metrics */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {company.industry}
              </span>
              <span className="text-xs font-mono text-zinc-500">ID: {company.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mt-1">{company.name}</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{company.vision}</p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Tasks</div>
              <div className="text-lg font-semibold text-zinc-100 mt-0.5">{tasks.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Completed</div>
              <div className="text-lg font-semibold text-emerald-400 mt-0.5">{completedTasks}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Blocked</div>
              <div className="text-lg font-semibold text-amber-400 mt-0.5">{blockedTasks}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Artifacts</div>
              <div className="text-lg font-semibold text-indigo-400 mt-0.5">{artifacts.length}</div>
            </div>
          </div>
        </div>

        {/* Canonical Brief Section */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Canonical Company Brief
              </h2>
            </div>
            {!isEditingBrief ? (
              <button
                onClick={() => setIsEditingBrief(true)}
                className="flex items-center space-x-1 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Brief</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditingBrief(false)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveBrief}
                  disabled={isSaving}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {!isEditingBrief ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800 text-sm text-zinc-300 leading-relaxed font-sans">
                {context.brief || 'No canonical brief defined yet.'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800">
                  <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Customer</span>
                  </div>
                  <p className="text-sm text-zinc-200">{context.target_customer}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800">
                  <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Value Proposition</span>
                  </div>
                  <p className="text-sm text-zinc-200">{context.value_prop}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-zinc-900/70 p-4 rounded-lg border border-zinc-800">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Company Brief</label>
                <textarea
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  rows={4}
                  className="w-full rounded-md bg-zinc-950 border border-zinc-800 p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Target Customer</label>
                  <input
                    type="text"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    className="w-full rounded-md bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Value Proposition</label>
                  <input
                    type="text"
                    value={valueProp}
                    onChange={(e) => setValueProp(e.target.value)}
                    className="w-full rounded-md bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assumptions & Decisions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Strategic Assumptions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Strategic Assumptions
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {(context.assumptions || []).length} tracked
            </span>
          </div>

          <div className="space-y-3">
            {(context.assumptions || []).length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono italic">No assumptions recorded.</p>
            ) : (
              context.assumptions.map((asm) => {
                const confColor =
                  asm.confidence === 'high'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
                    : asm.confidence === 'medium'
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
                    : 'text-zinc-400 border-zinc-700 bg-zinc-800/40';

                const statusColor =
                  asm.status === 'validated'
                    ? 'text-emerald-400'
                    : asm.status === 'invalidated'
                    ? 'text-red-400'
                    : 'text-zinc-500';

                return (
                  <div
                    key={asm.id}
                    className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">{asm.statement}</p>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${confColor}`}
                      >
                        {asm.confidence}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 mt-2 text-[10px] font-mono text-zinc-500">
                      <span className="uppercase tracking-wider">{asm.category}</span>
                      <span>•</span>
                      <span className={`capitalize flex items-center space-x-1 ${statusColor}`}>
                        {asm.status === 'validated' && <CheckCircle2 className="w-3 h-3 inline mr-0.5" />}
                        {asm.status === 'invalidated' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                        {asm.status === 'untested' && <Clock className="w-3 h-3 inline mr-0.5" />}
                        <span>{asm.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Strategic Decisions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <GitCommit className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Decisions & Rationale
              </h2>
            </div>
            <button
              onClick={onOpenNewDecisionModal}
              className="flex items-center space-x-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Propose</span>
            </button>
          </div>

          <div className="space-y-3">
            {decisions.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono italic">No decisions recorded yet.</p>
            ) : (
              decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-100">{dec.title}</h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {dec.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-sans">{dec.rationale}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-500">
                    <span>Decided by: {dec.decided_by}</span>
                    <span>{new Date(dec.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
