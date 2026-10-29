import React, { useState } from 'react';
import { Artifact, Task } from '../../types';
import { FileCode2, Copy, Check, Download, Layers, Calendar, ExternalLink } from 'lucide-react';

interface ArtifactBrowserProps {
  artifacts: Artifact[];
  tasks: Task[];
  initialArtifactId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

export const ArtifactBrowser: React.FC<ArtifactBrowserProps> = ({
  artifacts,
  tasks,
  initialArtifactId,
  onSelectTask
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialArtifactId || (artifacts[0]?.id ?? '')
  );
  const [copied, setCopied] = useState(false);

  // Synchronize when initialArtifactId changes
  React.useEffect(() => {
    if (initialArtifactId) {
      setSelectedId(initialArtifactId);
    } else if (artifacts.length > 0 && !artifacts.some((a) => a.id === selectedId)) {
      setSelectedId(artifacts[0].id);
    }
  }, [initialArtifactId, artifacts]);

  const selectedArtifact = artifacts.find((a) => a.id === selectedId) || artifacts[0];
  const producingTask = selectedArtifact
    ? tasks.find((t) => t.id === selectedArtifact.task_id)
    : null;

  const handleCopy = () => {
    if (selectedArtifact) {
      navigator.clipboard.writeText(selectedArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!selectedArtifact) return;
    const blob = new Blob([selectedArtifact.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedArtifact.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (artifacts.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
        <FileCode2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-zinc-300">No Artifacts Generated Yet</h3>
        <p className="text-xs text-zinc-500 mt-1">Run and approve tasks in the Task Board to produce shared knowledge deliverables.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left List of Artifacts */}
      <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
        <div className="px-2 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 flex items-center justify-between">
          <span>Shared Artifacts</span>
          <span className="text-zinc-600">{artifacts.length}</span>
        </div>

        <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
          {artifacts.map((art) => {
            const isSelected = art.id === selectedArtifact?.id;
            return (
              <button
                key={art.id}
                onClick={() => setSelectedId(art.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {art.type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">v{art.version}</span>
                </div>
                <h4 className={`text-xs font-semibold line-clamp-2 ${isSelected ? 'text-emerald-400' : 'text-zinc-200'}`}>
                  {art.title}
                </h4>
                <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(art.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Artifact Previewer */}
      <div className="lg:col-span-8 rounded-xl border border-zinc-800 bg-[#0c0c10] p-6">
        {selectedArtifact ? (
          <div>
            {/* Header info & tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-mono text-zinc-500">ID: {selectedArtifact.id}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedArtifact.type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Version {selectedArtifact.version}</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-100">{selectedArtifact.title}</h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>

            {/* Producing Task Reference */}
            {producingTask && (
              <div className="my-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-500">Produced by task:</span>
                  <span className="text-zinc-200 font-semibold">{producingTask.title}</span>
                </div>
                {onSelectTask && (
                  <button
                    onClick={() => onSelectTask(producingTask.id)}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>View Task</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Markdown Display */}
            <div className="mt-4 p-6 rounded-lg bg-zinc-950/80 border border-zinc-900 font-sans text-sm text-zinc-200 leading-relaxed max-h-[640px] overflow-y-auto whitespace-pre-wrap selection:bg-emerald-500/20">
              {selectedArtifact.content}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-xs font-mono text-zinc-500">Select an artifact to view.</div>
        )}
      </div>
    </div>
  );
};
