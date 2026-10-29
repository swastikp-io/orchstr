import React from 'react';
import { X, Terminal, FileCode, CheckCircle2, ShieldAlert, RotateCcw, Clock, Play } from 'lucide-react';
import { Task, AgentDefinition } from '../../types';

interface TaskDetailModalProps {
  task: Task | null;
  agents: AgentDefinition[];
  allTasks: Task[];
  onClose: () => void;
  onOpenPacket: (task: Task) => void;
  onOpenArtifact: (artifactId: string) => void;
  onRetry: (taskId: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  agents,
  allTasks,
  onClose,
  onOpenPacket,
  onOpenArtifact,
  onRetry
}) => {
  if (!task) return null;

  const agent = agents.find((a) => a.id === task.assigned_agent_id);
  const prereqTasks = (task.dependencies || [])
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean) as Task[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-800 bg-[#0c0c10] shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-mono text-zinc-500">ID: {task.id}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                {task.department}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                  task.status === 'completed' || task.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : task.status === 'blocked'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : task.status === 'review'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}
              >
                {task.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-100">{task.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Description */}
          <div>
            <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">Directives & Scope</h4>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 leading-relaxed font-sans">
              {task.description}
            </div>
          </div>

          {/* Assigned Agent Details */}
          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Assigned Specialist</span>
              <div className="text-sm font-semibold text-zinc-200 mt-0.5">{agent ? agent.name : task.assigned_agent_id}</div>
              <div className="text-xs font-mono text-emerald-400">{agent?.role}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Priority & Retries</span>
              <div className="text-xs font-mono text-zinc-300 capitalize">{task.priority} Priority</div>
              <div className="text-[10px] font-mono text-zinc-500">Retry count: {task.retry_count} / {task.max_retries}</div>
            </div>
          </div>

          {/* Prerequisites / Dependencies */}
          <div>
            <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Prerequisite Tasks ({prereqTasks.length})
            </h4>
            {prereqTasks.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 italic">No prerequisites. Root task ready to run.</p>
            ) : (
              <div className="space-y-1.5">
                {prereqTasks.map((prereq) => {
                  const isPrereqDone = prereq.status === 'completed' || prereq.status === 'approved';
                  return (
                    <div
                      key={prereq.id}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        {isPrereqDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-zinc-200 font-medium">{prereq.title}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                        {prereq.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Missing Inputs Warning */}
          {task.missing_inputs && task.missing_inputs.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <div className="flex items-center space-x-2 font-mono font-semibold mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Missing Inputs Required by Specialist:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-amber-200/90 pl-1">
                {task.missing_inputs.map((inp, idx) => (
                  <li key={idx}>{inp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Acceptance Criteria */}
          <div>
            <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Manager Acceptance Review Criteria
            </h4>
            <ul className="space-y-1.5">
              {task.acceptance_criteria.map((crit, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-zinc-300 font-sans p-2 rounded bg-zinc-950 border border-zinc-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{crit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outputs preview if any */}
          {task.outputs && (
            <div>
              <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">Outputs Payload</h4>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-36">
                {JSON.stringify(task.outputs, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {task.artifact_id && (
              <button
                onClick={() => {
                  onClose();
                  onOpenArtifact(task.artifact_id!);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
              >
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>View Artifact</span>
              </button>
            )}

            {(task.status === 'failed' || task.status === 'review') && (
              <button
                onClick={() => onRetry(task.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-amber-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Task Safely</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenPacket(task);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-colors shadow-sm"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Antigravity Packet & Runner</span>
          </button>
        </div>
      </div>
    </div>
  );
};
