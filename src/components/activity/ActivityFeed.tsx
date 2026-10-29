import React, { useState } from 'react';
import { ActivityEvent } from '../../types';
import { Activity, Clock, User, Filter, CheckCircle, ShieldAlert, FileText, Zap } from 'lucide-react';

interface ActivityFeedProps {
  activity: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activity }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = activity.filter((act) => {
    if (filterType === 'all') return true;
    return act.entity_type === filterType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Zap className="w-3.5 h-3.5 text-sky-400" />;
      case 'artifact':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      case 'approval':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'decision':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0c0c10] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">Recent Activity & Audit Trail</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable log of task state transitions, specialist deliverable outputs, and manager approvals.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none"
          >
            <option value="all">All Events</option>
            <option value="task">Tasks</option>
            <option value="artifact">Artifacts</option>
            <option value="approval">Approvals</option>
            <option value="decision">Decisions</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-600 italic">No activity events recorded.</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex items-start space-x-3"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                {getEventIcon(item.entity_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-zinc-200">{item.summary}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                      {item.entity_type}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center space-x-2 mt-1.5 text-[10px] font-mono text-zinc-500">
                  <User className="w-3 h-3 text-zinc-400" />
                  <span>Actor: <strong className="text-zinc-300 font-normal">{item.actor}</strong></span>
                  <span>•</span>
                  <span>Event: <code className="text-emerald-400">{item.event_type}</code></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
