import {
  Company, CompanyContext, Task, Artifact, ApprovalRequest,
  ActivityEvent, Decision, RoleDefinition, AgentDefinition, TaskPacket
} from './types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Companies
  getCompanies: () => request<Company[]>('/companies'),
  getCompany: (id: string) => request<{ company: Company; context: CompanyContext }>(`/companies/${id}`),
  createCompany: (data: {
    name: string;
    industry: string;
    vision: string;
    brief: string;
    target_customer: string;
    value_prop: string;
    assumptions?: Array<{ statement: string; confidence: 'low' | 'medium' | 'high'; status: 'untested' | 'validated' | 'invalidated'; category: 'market' | 'product' | 'customer' | 'growth' }>;
    constraints?: string[];
  }) => request<{ company: Company; context: CompanyContext }>('/companies', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateContext: (companyId: string, data: Partial<CompanyContext>) => request<CompanyContext>(`/companies/${companyId}/context`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Decisions
  getDecisions: (companyId: string) => request<Decision[]>(`/companies/${companyId}/decisions`),
  createDecision: (companyId: string, data: {
    title: string;
    context: string;
    rationale: string;
    status?: 'proposed' | 'accepted' | 'rejected' | 'superseded';
    decided_by?: string;
  }) => request<Decision>(`/companies/${companyId}/decisions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Agents & Roles
  getAgents: (companyId: string) => request<{ roles: RoleDefinition[]; agents: AgentDefinition[] }>(`/companies/${companyId}/agents`),

  // Tasks
  getTasks: (companyId: string) => request<Task[]>(`/companies/${companyId}/tasks`),
  getTask: (companyId: string, taskId: string) => request<Task>(`/companies/${companyId}/tasks/${taskId}`),
  createTask: (companyId: string, data: {
    title: string;
    description: string;
    assigned_agent_id: string;
    department: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    inputs?: Record<string, any>;
    acceptance_criteria: string[];
    parallelizable?: boolean;
    dependencies?: string[];
  }) => request<Task>(`/companies/${companyId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getTaskPacket: (companyId: string, taskId: string) => request<{ packet: TaskPacket; promptMarkdown: string }>(`/companies/${companyId}/tasks/${taskId}/packet`),
  executeTask: (companyId: string, taskId: string, options: {
    mode?: 'manual' | 'mock';
    output?: Record<string, any>;
    artifact_content?: string;
    artifact_title?: string;
    artifact_type?: string;
  }) => request<{ task: Task; artifact: Artifact; approvalRequest: ApprovalRequest }>(`/companies/${companyId}/tasks/${taskId}/execute`, {
    method: 'POST',
    body: JSON.stringify(options)
  }),
  retryTask: (companyId: string, taskId: string) => request<Task>(`/companies/${companyId}/tasks/${taskId}/retry`, {
    method: 'POST'
  }),
  recalculateTasks: (companyId: string) => request<{ unblockedTaskIds: string[] }>(`/companies/${companyId}/tasks/recalculate`, {
    method: 'POST'
  }),

  // Artifacts
  getArtifacts: (companyId: string) => request<Artifact[]>(`/companies/${companyId}/artifacts`),
  getArtifact: (companyId: string, artifactId: string) => request<Artifact>(`/companies/${companyId}/artifacts/${artifactId}`),

  // Approvals
  getApprovals: (companyId: string) => request<ApprovalRequest[]>(`/companies/${companyId}/approvals`),
  submitApproval: (companyId: string, approvalId: string, data: {
    status: 'approved' | 'rejected' | 'changes_requested';
    feedback?: string;
    reviewer_role?: string;
  }) => request<{ approval: ApprovalRequest; task: Task; unblockedTaskIds: string[] }>(`/companies/${companyId}/approvals/${approvalId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Activity
  getActivity: (companyId: string, limit = 50) => request<ActivityEvent[]>(`/companies/${companyId}/activity?limit=${limit}`),

  // Setup prompt
  getSetupPrompt: () => request<{
    prompt: string;
    configSnippet: Record<string, any>;
    cursorSnippet: Record<string, any>;
    claudeCodeCommand: string;
    fullCopyText: string;
  }>('/setup-prompt'),

  // Reseed DB
  reseed: () => request<{ success: boolean; message: string; apexFlowId: string; bioPulseId: string }>('/seed', {
    method: 'POST'
  })
};
