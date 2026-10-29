export type TaskStatus = 'queued' | 'running' | 'blocked' | 'review' | 'approved' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ArtifactType = 'markdown' | 'document' | 'dataset' | 'code' | 'strategy' | 'analysis';
export type EntityType = 'task' | 'artifact' | 'approval' | 'decision' | 'company' | 'agent_run';

export interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string;
  vision: string;
  created_at: string;
  updated_at: string;
}

export interface Assumption {
  id: string;
  statement: string;
  confidence: 'low' | 'medium' | 'high';
  status: 'untested' | 'validated' | 'invalidated';
  category: 'market' | 'product' | 'customer' | 'growth';
}

export interface CompanyContext {
  id: string;
  company_id: string;
  brief: string;
  target_customer: string;
  value_prop: string;
  assumptions: Assumption[];
  constraints: string[];
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  company_id: string;
  title: string;
  context: string;
  rationale: string;
  status: DecisionStatus;
  decided_by: string;
  decided_at?: string | null;
  created_at: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  department: string;
  purpose: string;
  instructions: string;
  required_inputs: string[];
  output_schema: string;
  acceptance_criteria: string[];
  permitted_actions: string[];
  is_manager: boolean;
  created_at: string;
}

export interface RoleDefinition {
  id: string;
  title: string;
  description: string;
  coordinated_agents: string[];
  approval_scope: string[];
}

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string;
  assigned_agent_id: string;
  department: string;
  status: TaskStatus;
  priority: TaskPriority;
  inputs: Record<string, any>;
  outputs?: Record<string, any> | null;
  acceptance_criteria: string[];
  parallelizable: boolean;
  retry_count: number;
  max_retries: number;
  missing_inputs?: string[] | null;
  created_at: string;
  updated_at: string;
  dependencies?: string[];
  assigned_agent?: AgentDefinition;
  artifact_id?: string | null;
}

export interface Artifact {
  id: string;
  company_id: string;
  task_id: string;
  title: string;
  type: ArtifactType;
  content: string;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  task_id: string;
  artifact_id?: string | null;
  reviewer_role: string;
  status: ApprovalStatus;
  feedback?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  task_title?: string;
  artifact_title?: string;
}

export interface ActivityEvent {
  id: string;
  company_id: string;
  entity_type: EntityType;
  entity_id: string;
  event_type: string;
  actor: string;
  summary: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface TaskPacketContextReference {
  company_id: string;
  company_name: string;
  brief: string;
  target_customer: string;
  value_prop: string;
  active_assumptions: Array<{ statement: string; confidence: string; status: string }>;
  constraints: string[];
}

export interface TaskPacketDependency {
  task_id: string;
  title: string;
  agent_name: string;
  status: string;
  artifact_id?: string | null;
  artifact_title?: string | null;
  artifact_summary?: string | null;
}

export interface TaskPacket {
  taskId: string;
  assignedAgent: {
    id: string;
    name: string;
    role: string;
    department: string;
    purpose: string;
    instructions: string;
    outputSchema: string;
    permittedActions: string[];
  };
  companyContextReferences: TaskPacketContextReference;
  dependencies: TaskPacketDependency[];
  instructions: {
    summary: string;
    stepByStep: string[];
    specialGuidance: string[];
  };
  outputDestination: {
    expectedTitle: string;
    expectedType: ArtifactType;
    schemaSummary: string;
    storageTarget: string;
  };
  acceptanceCriteria: string[];
  requiredApprovalLevel: string;
  generatedAt: string;
}
