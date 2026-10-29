import React, { useState } from 'react';
import { X, Plus, Trash2, KanbanSquare } from 'lucide-react';
import { AgentDefinition, Task, TaskPriority } from '../../types';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentDefinition[];
  existingTasks: Task[];
  onCreateTask: (data: {
    title: string;
    description: string;
    assigned_agent_id: string;
    department: string;
    priority: TaskPriority;
    inputs: Record<string, any>;
    acceptance_criteria: string[];
    parallelizable: boolean;
    dependencies: string[];
  }) => Promise<void>;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  agents,
  existingTasks,
  onCreateTask
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState(agents[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [parallelizable, setParallelizable] = useState(false);
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<string[]>(['Verify deliverable against acceptance guidelines']);
  const [newCriterion, setNewCriterion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAgent = agents.find((a) => a.id === assignedAgentId) || agents[0];

  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleToggleDep = (taskId: string) => {
    if (selectedDeps.includes(taskId)) {
      setSelectedDeps(selectedDeps.filter((id) => id !== taskId));
    } else {
      setSelectedDeps([...selectedDeps, taskId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !assignedAgentId) {
      setError('Please provide title, description, and assigned agent.');
      return;
    }
    if (criteria.length === 0) {
      setError('Please specify at least one acceptance criterion.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateTask({
        title,
        description,
        assigned_agent_id: assignedAgentId,
        department: currentAgent ? currentAgent.department : 'General',
        priority,
        inputs: {},
        acceptance_criteria: criteria,
        parallelizable,
        dependencies: selectedDeps
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
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
              <KanbanSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Create Orchestration Task</h3>
              <p className="text-xs text-zinc-400">Assign an agent with explicit dependencies and criteria.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct Competitive Positioning Analysis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Task Description & Directives *</label>
            <textarea
              required
              rows={3}
              placeholder="Detail the scope of work and concrete expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Assigned Agent *</label>
              <select
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="parallelizable"
              checked={parallelizable}
              onChange={(e) => setParallelizable(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
            />
            <label htmlFor="parallelizable" className="text-xs font-mono text-zinc-300 cursor-pointer">
              Mark as parallelizable (can run concurrently when dependencies are satisfied)
            </label>
          </div>

          {/* Dependencies Selection */}
          {existingTasks.length > 0 && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Prerequisites (Task Dependencies)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 space-y-1.5">
                {existingTasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center space-x-2 text-xs text-zinc-300 hover:bg-zinc-900 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDeps.includes(t.id)}
                      onChange={() => handleToggleDep(t.id)}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="truncate">{t.title}</span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase ml-auto">[{t.status}]</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Manager Acceptance Criteria Checklist
            </label>
            <div className="space-y-1.5 mb-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(i)}
                    className="text-zinc-500 hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add criteria (e.g. Include at least 3 competitor comparisons)..."
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCriterion(); } }}
                className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddCriterion}
                className="px-3 py-2 text-xs font-mono rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800/80">
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
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating Task...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
