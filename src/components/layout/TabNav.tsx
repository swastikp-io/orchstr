import React from 'react';
import {
  Compass,
  Users2,
  KanbanSquare,
  FileCode2,
  Inbox,
  Activity,
  TrendingUp
} from 'lucide-react';

export type TabId = 'overview' | 'directory' | 'tasks' | 'artifacts' | 'approvals' | 'activity' | 'review';

interface TabNavProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  pendingApprovalsCount: number;
  blockedTasksCount: number;
  totalTasksCount: number;
}

export const TabNav: React.FC<TabNavProps> = ({
  activeTab,
  onChangeTab,
  pendingApprovalsCount,
  blockedTasksCount,
  totalTasksCount
}) => {
  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: Compass },
    { id: 'directory' as TabId, label: 'Agents & Roles', icon: Users2 },
    {
      id: 'tasks' as TabId,
      label: 'Task Board',
      icon: KanbanSquare,
      badge: totalTasksCount > 0 ? `${totalTasksCount}` : undefined,
      badgeColor: 'bg-zinc-800 text-zinc-300'
    },
    { id: 'artifacts' as TabId, label: 'Knowledge & Artifacts', icon: FileCode2 },
    {
      id: 'approvals' as TabId,
      label: 'Approval Inbox',
      icon: Inbox,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    { id: 'review' as TabId, label: 'Operational Review', icon: TrendingUp },
    { id: 'activity' as TabId, label: 'Activity Log', icon: Activity }
  ];

  return (
    <div className="border-b border-zinc-800/80 bg-zinc-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-emerald-400 font-semibold border border-zinc-800 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
