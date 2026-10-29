import React, { useState, useEffect } from 'react';
import { Company, CompanyContext, Task, Artifact, ApprovalRequest, ActivityEvent, Decision, RoleDefinition, AgentDefinition } from './types';
import { api } from './api';
import { Navbar } from './components/layout/Navbar';
import { TabNav, TabId } from './components/layout/TabNav';
import { CompanyOverview } from './components/overview/CompanyOverview';
import { CreateCompanyModal } from './components/overview/CreateCompanyModal';
import { NewDecisionModal } from './components/overview/NewDecisionModal';
import { AgentDirectory } from './components/directory/AgentDirectory';
import { TaskBoard } from './components/tasks/TaskBoard';
import { NewTaskModal } from './components/tasks/NewTaskModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { AntigravityPacketViewer } from './components/packet/AntigravityPacketViewer';
import { ArtifactBrowser } from './components/artifacts/ArtifactBrowser';
import { ApprovalInbox } from './components/approvals/ApprovalInbox';
import { ActivityFeed } from './components/activity/ActivityFeed';
import { OperationalReviewTab } from './components/review/OperationalReviewTab';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ErrorBanner } from './components/common/ErrorBanner';

export const App: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReseeding, setIsReseeding] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Modals state
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isNewDecisionOpen, setIsNewDecisionOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedTaskForPacket, setSelectedTaskForPacket] = useState<Task | null>(null);
  const [selectedArtifactIdForBrowser, setSelectedArtifactIdForBrowser] = useState<string | null>(null);

  // Initial load: Fetch companies
  useEffect(() => {
    loadCompanies();
  }, []);

  // When active company changes, load workspace resources
  useEffect(() => {
    if (activeCompany) {
      loadWorkspaceData(activeCompany.id);
    }
  }, [activeCompany?.id]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCompanies();
      setCompanies(data);
      if (data.length > 0) {
        // Default to first company (e.g. ApexFlow)
        setActiveCompany(data[0]);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load companies.');
      setIsLoading(false);
    }
  };

  const loadWorkspaceData = async (companyId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const [compData, tasksData, artData, apprData, actData, decData, agData] = await Promise.all([
        api.getCompany(companyId),
        api.getTasks(companyId),
        api.getArtifacts(companyId),
        api.getApprovals(companyId),
        api.getActivity(companyId),
        api.getDecisions(companyId),
        api.getAgents(companyId)
      ]);

      setCompanyContext(compData.context);
      setTasks(tasksData);
      setArtifacts(artData);
      setApprovals(apprData);
      setActivity(actData);
      setDecisions(decData);
      setRoles(agData.roles);
      setAgents(agData.agents);
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace data.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTasksAndApprovals = async () => {
    if (!activeCompany) return;
    try {
      const [tasksData, artData, apprData, actData] = await Promise.all([
        api.getTasks(activeCompany.id),
        api.getArtifacts(activeCompany.id),
        api.getApprovals(activeCompany.id),
        api.getActivity(activeCompany.id)
      ]);
      setTasks(tasksData);
      setArtifacts(artData);
      setApprovals(apprData);
      setActivity(actData);
    } catch (err: any) {
      console.error('Refresh error:', err);
    }
  };

  const handleCreateCompany = async (data: any) => {
    const result = await api.createCompany(data);
    setCompanies([result.company, ...companies]);
    setActiveCompany(result.company);
    setActiveTab('overview');
  };

  const handleUpdateContext = async (updates: Partial<CompanyContext>) => {
    if (!activeCompany) return;
    const updated = await api.updateContext(activeCompany.id, updates);
    setCompanyContext(updated);
  };

  const handleCreateDecision = async (data: any) => {
    if (!activeCompany) return;
    const dec = await api.createDecision(activeCompany.id, data);
    setDecisions([dec, ...decisions]);
    const actData = await api.getActivity(activeCompany.id);
    setActivity(actData);
  };

  const handleCreateTask = async (taskData: any) => {
    if (!activeCompany) return;
    await api.createTask(activeCompany.id, taskData);
    await refreshTasksAndApprovals();
  };

  const handleRetryTask = async (taskId: string) => {
    if (!activeCompany) return;
    await api.retryTask(activeCompany.id, taskId);
    await refreshTasksAndApprovals();
  };

  const handleRecalculate = async () => {
    if (!activeCompany) return;
    setIsRecalculating(true);
    try {
      await api.recalculateTasks(activeCompany.id);
      await refreshTasksAndApprovals();
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSubmitApproval = async (approvalId: string, data: any) => {
    if (!activeCompany) return;
    await api.submitApproval(activeCompany.id, approvalId, data);
    await refreshTasksAndApprovals();
  };

  const handleReseed = async () => {
    if (!window.confirm('Reset database to clean canonical state? All mock data will be reseeded.')) return;
    setIsReseeding(true);
    try {
      await api.reseed();
      await loadCompanies();
    } catch (err: any) {
      setError(err.message || 'Reseed failed');
    } finally {
      setIsReseeding(false);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const blockedTasksCount = tasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
      <Navbar
        companies={companies}
        activeCompany={activeCompany}
        onSelectCompany={(c) => setActiveCompany(c)}
        onOpenCreateModal={() => setIsCreateCompanyOpen(true)}
        onReseed={handleReseed}
        isReseeding={isReseeding}
      />

      <TabNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        pendingApprovalsCount={pendingApprovalsCount}
        blockedTasksCount={blockedTasksCount}
        totalTasksCount={tasks.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {isLoading ? (
          <LoadingSpinner label="Loading workspace state..." />
        ) : !activeCompany || !companyContext ? (
          <div className="text-center py-20">
            <h2 className="text-lg font-bold text-zinc-300">No Company Workspace Found</h2>
            <button
              onClick={() => setIsCreateCompanyOpen(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-mono font-semibold"
            >
              Create First Workspace
            </button>
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && (
              <CompanyOverview
                company={activeCompany}
                context={companyContext}
                decisions={decisions}
                tasks={tasks}
                artifacts={artifacts}
                approvals={approvals}
                onUpdateContext={handleUpdateContext}
                onOpenNewDecisionModal={() => setIsNewDecisionOpen(true)}
              />
            )}

            {activeTab === 'directory' && (
              <AgentDirectory
                roles={roles}
                agents={agents}
                tasks={tasks}
                onSelectTask={(taskId) => {
                  const target = tasks.find((t) => t.id === taskId);
                  if (target) setSelectedTaskForDetail(target);
                }}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskBoard
                tasks={tasks}
                agents={agents}
                onOpenNewTaskModal={() => setIsNewTaskOpen(true)}
                onOpenPacketViewer={(task) => setSelectedTaskForPacket(task)}
                onOpenTaskDetail={(task) => setSelectedTaskForDetail(task)}
                onOpenArtifact={(artId) => {
                  setSelectedArtifactIdForBrowser(artId);
                  setActiveTab('artifacts');
                }}
                onRetryTask={handleRetryTask}
                onRecalculate={handleRecalculate}
                isRecalculating={isRecalculating}
              />
            )}

            {activeTab === 'artifacts' && (
              <ArtifactBrowser
                artifacts={artifacts}
                tasks={tasks}
                initialArtifactId={selectedArtifactIdForBrowser}
                onSelectTask={(taskId) => {
                  const t = tasks.find((x) => x.id === taskId);
                  if (t) setSelectedTaskForDetail(t);
                }}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalInbox
                approvals={approvals}
                tasks={tasks}
                artifacts={artifacts}
                onSubmitApproval={handleSubmitApproval}
                onOpenArtifact={(artId) => {
                  setSelectedArtifactIdForBrowser(artId);
                  setActiveTab('artifacts');
                }}
                onOpenTask={(taskId) => {
                  const t = tasks.find((x) => x.id === taskId);
                  if (t) setSelectedTaskForDetail(t);
                }}
              />
            )}

            {activeTab === 'review' && (
              <OperationalReviewTab companyId={activeCompany.id} />
            )}

            {activeTab === 'activity' && (
              <ActivityFeed activity={activity} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-zinc-400">ORCHSTR</span>
            <span>•</span>
            <span>AI-Native Company Operating System</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Deterministic Orchestration Engine</span>
            <span>•</span>
            <span>Google Antigravity Ready</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onCreate={handleCreateCompany}
      />

      <NewDecisionModal
        isOpen={isNewDecisionOpen}
        onClose={() => setIsNewDecisionOpen(false)}
        onSubmit={handleCreateDecision}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        agents={agents}
        existingTasks={tasks}
        onCreateTask={handleCreateTask}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        agents={agents}
        allTasks={tasks}
        onClose={() => setSelectedTaskForDetail(null)}
        onOpenPacket={(t) => setSelectedTaskForPacket(t)}
        onOpenArtifact={(artId) => {
          setSelectedArtifactIdForBrowser(artId);
          setActiveTab('artifacts');
        }}
        onRetry={handleRetryTask}
      />

      {activeCompany && (
        <AntigravityPacketViewer
          task={selectedTaskForPacket}
          companyId={activeCompany.id}
          isOpen={!!selectedTaskForPacket}
          onClose={() => setSelectedTaskForPacket(null)}
          onTaskExecuted={async () => {
            await refreshTasksAndApprovals();
          }}
        />
      )}
    </div>
  );
};

export default App;
