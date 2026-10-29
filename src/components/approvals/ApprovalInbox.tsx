import React, { useState } from 'react';
import { ApprovalRequest, Task, Artifact } from '../../types';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Clock,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface ApprovalInboxProps {
  approvals: ApprovalRequest[];
  tasks: Task[];
  artifacts: Artifact[];
  onSubmitApproval: (approvalId: string, data: {
    status: 'approved' | 'rejected' | 'changes_requested';
    feedback?: string;
    reviewer_role?: string;
  }) => Promise<void>;
  onOpenArtifact: (artifactId: string) => void;
  onOpenTask: (taskId: string) => void;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  approvals,
  tasks,
  artifacts,
  onSubmitApproval,
  onOpenArtifact,
  onOpenTask
}) => {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(
    approvals.find((a) => a.status === 'pending')?.id || approvals[0]?.id || ''
  );
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selection
  React.useEffect(() => {
    if (!approvals.some((a) => a.id === selectedApprovalId)) {
      setSelectedApprovalId(approvals.find((a) => a.status === 'pending')?.id || approvals[0]?.id || '');
    }
  }, [approvals]);

  const selectedApproval = approvals.find((a) => a.id === selectedApprovalId) || approvals[0];
  const relatedTask = selectedApproval ? tasks.find((t) => t.id === selectedApproval.task_id) : null;
  const relatedArtifact = selectedApproval?.artifact_id
    ? artifacts.find((a) => a.id === selectedApproval.artifact_id)
    : null;

  const handleAction = async (status: 'approved' | 'rejected' | 'changes_requested') => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitApproval(selectedApproval.id, {
        status,
        feedback: feedback.trim() || undefined,
        reviewer_role: selectedApproval.reviewer_role
      });
      setFeedback('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'pending');

  if (approvals.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
        <Inbox className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-zinc-300">Approval Inbox is Clean</h3>
        <p className="text-xs text-zinc-500 mt-1">When specialists produce deliverables, managers review them here against acceptance criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left List of Approvals */}
      <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-4">
        {/* Pending Section */}
        <div>
          <div className="px-2 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 border-b border-zinc-900 flex items-center justify-between mb-2">
            <span>Pending Review ({pendingApprovals.length})</span>
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {pendingApprovals.length === 0 ? (
              <div className="p-3 text-[11px] font-mono text-zinc-600 italic text-center">No pending reviews</div>
            ) : (
              pendingApprovals.map((appr) => {
                const isSelected = appr.id === selectedApproval?.id;
                return (
                  <button
                    key={appr.id}
                    onClick={() => setSelectedApprovalId(appr.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-amber-500/50 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {appr.reviewer_role}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(appr.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2">
                      {appr.task_title || 'Task Deliverable Review'}
                    </h4>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Resolved Section */}
        {resolvedApprovals.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-900 flex items-center justify-between mb-2">
              <span>Past Decisions ({resolvedApprovals.length})</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {resolvedApprovals.map((appr) => {
                const isSelected = appr.id === selectedApproval?.id;
                return (
                  <button
                    key={appr.id}
                    onClick={() => setSelectedApprovalId(appr.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-700'
                        : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                          appr.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {appr.status}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{appr.reviewer_role}</span>
                    </div>
                    <div className="text-xs text-zinc-400 truncate">{appr.task_title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Review Pane */}
      <div className="lg:col-span-8 rounded-xl border border-zinc-800 bg-[#0c0c10] p-6 space-y-5">
        {selectedApproval ? (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-mono text-zinc-500">Approval ID: {selectedApproval.id}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Reviewer: {selectedApproval.reviewer_role}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                      selectedApproval.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : selectedApproval.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {selectedApproval.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-100">{relatedTask?.title || selectedApproval.task_title}</h3>
              </div>

              {relatedArtifact && (
                <button
                  onClick={() => onOpenArtifact(relatedArtifact.id)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-emerald-400 transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Inspect Full Artifact</span>
                </button>
              )}
            </div>

            {error && (
              <div className="my-3 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 font-mono">
                {error}
              </div>
            )}

            {/* Acceptance Criteria Checklist */}
            <div className="my-4">
              <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Acceptance Criteria Checklist (Manager Signoff)
              </h4>
              <div className="space-y-1.5">
                {(relatedTask?.acceptance_criteria || []).map((crit, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/90 flex items-start space-x-2 text-xs text-zinc-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverable Preview Snippet */}
            {relatedArtifact && (
              <div className="my-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    Deliverable Preview: {relatedArtifact.title}
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">v{relatedArtifact.version}</span>
                </div>
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {relatedArtifact.content.substring(0, 1200)}
                  {relatedArtifact.content.length > 1200 && '... [truncated preview]'}
                </div>
              </div>
            )}

            {/* Past Feedback if resolved */}
            {selectedApproval.feedback && (
              <div className="my-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-300 font-sans">
                <strong className="text-zinc-400 block font-mono text-[10px] uppercase mb-1">Manager Feedback:</strong>
                {selectedApproval.feedback}
              </div>
            )}

            {/* Decision Controls (Active if pending) */}
            {selectedApproval.status === 'pending' && (
              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1 flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Manager Review Notes / Feedback (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide acceptance comments or required revisions..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleAction('changes_requested')}
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-red-500/30 text-red-300 text-xs font-mono font-medium transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleAction('approved')}
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Complete Task</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-xs font-mono text-zinc-500">Select an item from the inbox.</div>
        )}
      </div>
    </div>
  );
};
