import React, { useState } from 'react';
import { Task, TaskStatus, AgentDefinition } from '../../types';
import {
  KanbanSquare,
  Plus,
  RefreshCw,
  Clock,
  Play,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Terminal,
  RotateCcw,
  Zap,
  Filter
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  agents: AgentDefinition[];
  onOpenNewTaskModal: () => void;
  onOpenPacketViewer: (task: Task) => void;
  onOpenTaskDetail: (task: Task) => void;
  onOpenArtifact: (artifactId: string) => void;
  onRetryTask: (taskId: string) => Promise<void>;
  onRecalculate: () => Promise<void>;
  isRecalculating: boolean;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  agents,
  onOpenNewTaskModal,
  onOpenPacketViewer,
  onOpenTaskDetail,
  onOpenArtifact,
  onRetryTask,
  onRecalculate,
  isRecalculating
}) => {
  const [filterDept, setFilterDept] = useState<string>('all');
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

  const columns: Array<{ id: TaskStatus; label: string; icon: any; color: string; border: string }> = [
    { id: 'queued', label: 'Queued', icon: Clock, color: 'text-zinc-400', border: 'border-zinc-800' },
    { id: 'running', label: 'Running', icon: Play, color: 'text-sky-400', border: 'border-sky-500/30' },
    { id: 'blocked', label: 'Blocked', icon: ShieldAlert, color: 'text-amber-400', border: 'border-amber-500/30' },
    { id: 'review', label: 'Review', icon: FileCheck, color: 'text-purple-400', border: 'border-purple-500/30' },
    { id: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-teal-400', border: 'border-teal-500/30' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30' }
  ];

  const filteredTasks = tasks.filter((t) => {
    if (filterDept !== 'all' && t.department.toLowerCase() !== filterDept.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleRetry = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingTaskId(taskId);
    try {
      await onRetryTask(taskId);
    } finally {
      setRetryingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <KanbanSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">Deterministic Task Board</h2>
          </div>

          <div className="flex items-center space-x-1.5 pl-3 border-l border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none"
            >
              <option value="all">All Departments</option>
              <option value="strategy">Strategy</option>
              <option value="research">Research</option>
              <option value="growth">Growth</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            title="Recalculate task dependencies and unlock satisfied prerequisites"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Recalculate DAG</span>
          </button>

          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 6-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className={`rounded-xl border ${col.border} bg-zinc-950/40 p-3 min-h-[500px] flex flex-col justify-between`}
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-900">
                  <div className="flex items-center space-x-1.5">
                    <ColIcon className={`w-3.5 h-3.5 ${col.color}`} />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
                      {col.label}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 text-[10px] font-mono font-medium text-zinc-400 border border-zinc-800">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-[11px] font-mono text-zinc-600 italic">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const agent = agents.find((a) => a.id === task.assigned_agent_id);
                      const hasMissingInputs = task.missing_inputs && task.missing_inputs.length > 0;
                      const hasDependencies = task.dependencies && task.dependencies.length > 0;

                      return (
                        <div
                          key={task.id}
                          onClick={() => onOpenTaskDetail(task)}
                          className="group relative p-3 rounded-lg bg-[#0e0e12] border border-zinc-800/90 hover:border-zinc-700 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        >
                          {/* Priority and Parallelizable indicators */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                                task.priority === 'critical'
                                  ? 'text-red-400 border-red-500/30 bg-red-500/5'
                                  : task.priority === 'high'
                                  ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
                                  : 'text-zinc-400 border-zinc-800 bg-zinc-900'
                              }`}
                            >
                              {task.priority}
                            </span>

                            <div className="flex items-center space-x-1">
                              {task.parallelizable && (
                                <span title="Parallelizable Task" className="text-emerald-400">
                                  <Zap className="w-3 h-3 inline" />
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                {task.department}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                            {task.title}
                          </h4>

                          {/* Assigned Agent */}
                          <div className="flex items-center space-x-1.5 mt-2 text-[10px] font-mono text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            <span className="truncate">{agent ? agent.name : task.assigned_agent_id}</span>
                          </div>

                          {/* Dependencies count or missing inputs banner */}
                          {hasDependencies && (
                            <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center space-x-1">
                              <span>Prereqs:</span>
                              <span className="text-zinc-400 font-semibold">{task.dependencies!.length}</span>
                            </div>
                          )}

                          {hasMissingInputs && (
                            <div className="mt-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-300 flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate">Missing inputs surfaced</span>
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono">
                            {/* Action to view / run via Antigravity Packet */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPacketViewer(task);
                              }}
                              className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium"
                              title="Inspect Task Packet and Run in Antigravity"
                            >
                              <Terminal className="w-3 h-3" />
                              <span>Packet / Run</span>
                            </button>

                            <div className="flex items-center space-x-1.5">
                              {task.artifact_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenArtifact(task.artifact_id!);
                                  }}
                                  className="text-zinc-400 hover:text-zinc-200"
                                  title="View Generated Artifact"
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {(task.status === 'failed' || task.status === 'review') && (
                                <button
                                  onClick={(e) => handleRetry(task.id, e)}
                                  disabled={retryingTaskId === task.id}
                                  className="text-amber-400 hover:text-amber-300 disabled:opacity-50"
                                  title="Retry Task Safely"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${retryingTaskId === task.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column Footer */}
              <div className="mt-3 pt-2 border-t border-zinc-900 text-center">
                <span className="text-[10px] font-mono text-zinc-600">
                  {colTasks.length} {colTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
