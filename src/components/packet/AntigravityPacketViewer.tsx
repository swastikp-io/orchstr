import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, Play, FileCheck, Code2, AlertTriangle, Sparkles } from 'lucide-react';
import { Task, TaskPacket } from '../../types';
import { api } from '../../api';

interface AntigravityPacketViewerProps {
  task: Task | null;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskExecuted: (task: Task) => void;
}

export const AntigravityPacketViewer: React.FC<AntigravityPacketViewerProps> = ({
  task,
  companyId,
  isOpen,
  onClose,
  onTaskExecuted
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'json' | 'submit'>('prompt');
  const [packetData, setPacketData] = useState<{ packet: TaskPacket; promptMarkdown: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual submission form state
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactType, setArtifactType] = useState('markdown');
  const [artifactContent, setArtifactContent] = useState('');

  useEffect(() => {
    if (isOpen && task) {
      loadPacket();
      setArtifactTitle(`${task.title} - Deliverable`);
      setArtifactContent('');
      setError(null);
    }
  }, [isOpen, task]);

  const loadPacket = async () => {
    if (!task) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getTaskPacket(companyId, task.id);
      setPacketData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load task packet.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const handleCopyPrompt = () => {
    if (packetData?.promptMarkdown) {
      navigator.clipboard.writeText(packetData.promptMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artifactContent.trim()) {
      setError('Please provide deliverable content.');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const res = await api.executeTask(companyId, task.id, {
        mode: 'manual',
        artifact_title: artifactTitle,
        artifact_type: artifactType,
        artifact_content: artifactContent
      });
      onTaskExecuted(res.task);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit deliverable.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleMockExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const res = await api.executeTask(companyId, task.id, {
        mode: 'mock'
      });
      onTaskExecuted(res.task);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute task.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-xl border border-zinc-800 bg-[#0c0c10] shadow-2xl p-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-zinc-400">Task ID: {task.id}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Antigravity Execution Adapter
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Approval: <strong className="text-zinc-300 font-semibold">{packetData?.packet.requiredApprovalLevel}</strong>
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-100 mt-0.5">{task.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between pt-3 pb-2 border-b border-zinc-900 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                activeTab === 'prompt'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Actionable Antigravity Prompt
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                activeTab === 'json'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Structured Packet JSON
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                activeTab === 'submit'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Submit Deliverable / Execute
            </button>
          </div>

          {activeTab === 'prompt' && (
            <button
              onClick={handleCopyPrompt}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Prompt!' : 'Copy Prompt for Antigravity'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="my-3 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 font-mono shrink-0">
            {error}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">Preparing task packet...</div>
          ) : activeTab === 'prompt' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300/90 font-sans flex items-start space-x-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <strong>How to execute via Antigravity:</strong> Copy the prompt below into your Google Antigravity chat session or IDE prompt window. Once the deliverable is generated, paste it into the <em>Submit Deliverable</em> tab to queue it for Manager review.
                </div>
              </div>

              <div className="relative rounded-lg border border-zinc-800 bg-[#070709] p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-all">
                {packetData?.promptMarkdown}
              </div>
            </div>
          ) : activeTab === 'json' ? (
            <div className="rounded-lg border border-zinc-800 bg-[#070709] p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
              <pre>{JSON.stringify(packetData?.packet, null, 2)}</pre>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Option A: Manual Paste */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Manual Deliverable Submission</span>
                </h4>
                <p className="text-xs text-zinc-400 mb-3">
                  Paste the deliverable generated by your Antigravity session. This will store the artifact safely and submit an approval request to the responsible manager.
                </p>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Deliverable Title</label>
                      <input
                        type="text"
                        value={artifactTitle}
                        onChange={(e) => setArtifactTitle(e.target.value)}
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Artifact Type</label>
                      <select
                        value={artifactType}
                        onChange={(e) => setArtifactType(e.target.value)}
                        className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        <option value="markdown">Markdown Document</option>
                        <option value="strategy">Strategic Framework</option>
                        <option value="analysis">Research Analysis</option>
                        <option value="document">Campaign Sequence</option>
                        <option value="code">Code / Telemetry Schema</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Markdown Content *</label>
                    <textarea
                      required
                      rows={8}
                      placeholder="# Deliverable Heading&#10;&#10;Paste output from Antigravity here..."
                      value={artifactContent}
                      onChange={(e) => setArtifactContent(e.target.value)}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500 placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isExecuting}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                    >
                      {isExecuting ? 'Submitting...' : 'Submit to Review Inbox'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Option B: Deterministic Mock Simulation */}
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Play className="w-4 h-4 text-sky-400" />
                      <span>Deterministic Simulation Runner</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                      Instantly simulate the Antigravity specialist execution using pre-computed high-fidelity domain deliverables for deterministic testing and workflow verification.
                    </p>
                  </div>
                  <button
                    onClick={handleMockExecute}
                    disabled={isExecuting || task.status === 'blocked'}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-medium text-sky-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isExecuting ? 'Executing...' : 'Run Simulation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
