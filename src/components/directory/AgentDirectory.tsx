import React, { useState } from 'react';
import { RoleDefinition, AgentDefinition, Task } from '../../types';
import {
  Users2,
  Shield,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Code2,
  ArrowRight
} from 'lucide-react';

interface AgentDirectoryProps {
  roles: RoleDefinition[];
  agents: AgentDefinition[];
  tasks: Task[];
  onSelectTask?: (taskId: string) => void;
}

export const AgentDirectory: React.FC<AgentDirectoryProps> = ({
  roles,
  agents,
  tasks,
  onSelectTask
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const departments = ['all', 'Strategy', 'Research', 'Growth', 'Product'];

  const filteredAgents = selectedDept === 'all'
    ? agents
    : agents.filter((a) => a.department.toLowerCase() === selectedDept.toLowerCase());

  return (
    <div className="space-y-8">
      {/* 1. Managerial Leadership Roles */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-zinc-100 tracking-tight">Executive & Managerial Roles</h2>
        </div>
        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Human and supervisory roles governing acceptance review, quality criteria, and strategic decisions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-100 font-mono flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    <span>{role.title}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Governance
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-3">{role.description}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-[11px] font-mono">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">Coordinated Agents:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {role.coordinated_agents.map((agId) => {
                      const matched = agents.find((a) => a.id === agId);
                      return (
                        <span key={agId} className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 text-[10px]">
                          {matched ? matched.name.split(' ')[0] : agId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">Approval Scope:</span>
                  <ul className="text-zinc-400 text-[10px] list-disc list-inside mt-0.5 space-y-0.5 font-sans">
                    {role.approval_scope.map((scope, idx) => (
                      <li key={idx} className="truncate">{scope}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Specialized Agents Directory */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-zinc-100 tracking-tight">Specialized Agent Definitions</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Deterministic agent specifications with strict input contracts, output schemas, and permitted actions.
            </p>
          </div>

          {/* Department Filter Tabs */}
          <div className="flex items-center space-x-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 text-xs font-mono rounded capitalize transition-colors ${
                  selectedDept.toLowerCase() === dept.toLowerCase()
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredAgents.map((agent) => {
            const isExpanded = expandedAgentId === agent.id;
            const assignedTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);

            return (
              <div
                key={agent.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-zinc-500">ID: {agent.id}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {agent.department}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-100 mt-1">{agent.name}</h3>
                      <div className="text-xs text-emerald-400 font-mono">{agent.role}</div>
                    </div>

                    <button
                      onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-3">{agent.purpose}</p>

                  {/* Permitted Actions */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                      Permitted Actions
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {agent.permitted_actions.map((act) => (
                        <span
                          key={act}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-zinc-300 border border-zinc-800"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Active Tasks Assigned */}
                  {assignedTasks.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                        Active Workspace Tasks ({assignedTasks.length})
                      </span>
                      <div className="space-y-1">
                        {assignedTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask && onSelectTask(t.id)}
                            className="flex items-center justify-between text-xs hover:bg-zinc-900 p-1 rounded cursor-pointer transition-colors"
                          >
                            <span className="text-zinc-300 truncate max-w-[240px] font-medium">{t.title}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border bg-zinc-900 border-zinc-700 text-zinc-400">
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Detailed Specification */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-4 text-xs font-mono">
                      <div>
                        <span className="text-zinc-500 uppercase tracking-wider block mb-1">Instructions:</span>
                        <div className="p-3 rounded bg-zinc-950 text-zinc-300 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                          {agent.instructions}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 uppercase tracking-wider block mb-1">Required Inputs:</span>
                        <div className="flex flex-wrap gap-1">
                          {agent.required_inputs.map((inp) => (
                            <span key={inp} className="px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300 border border-amber-500/20 text-[10px]">
                              {inp}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 uppercase tracking-wider block mb-1">Acceptance Review Criteria:</span>
                        <ul className="space-y-1 text-zinc-300 font-sans text-[11px]">
                          {agent.acceptance_criteria.map((c, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-zinc-500 uppercase tracking-wider block mb-1">Output Schema:</span>
                        <pre className="p-2.5 rounded bg-zinc-950 text-zinc-400 text-[10px] overflow-x-auto max-h-36">
                          {agent.output_schema}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Contract Version: 1.0</span>
                  <button
                    onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>{isExpanded ? 'Less' : 'Inspect Contract'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
