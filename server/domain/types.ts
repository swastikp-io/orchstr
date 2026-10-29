import { z } from 'zod';

export type TaskStatus = 'queued' | 'running' | 'blocked' | 'review' | 'approved' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ArtifactType = 'markdown' | 'document' | 'dataset' | 'code' | 'strategy' | 'analysis';
export type EntityType = 'task' | 'artifact' | 'approval' | 'decision' | 'company' | 'agent_run';
export type AgentRunStatus = 'started' | 'completed' | 'failed';

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
  dependencies?: string[]; // array of task IDs it depends on
  assigned_agent?: AgentDefinition;
  artifact_id?: string | null;
}

export interface TaskDependency {
  id: string;
  company_id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
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

export interface AgentRun {
  id: string;
  company_id: string;
  task_id: string;
  agent_id: string;
  status: AgentRunStatus;
  input_packet: Record<string, any>;
  output_result?: Record<string, any> | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

// Zod schemas for input validation
export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.string().min(2).max(100),
  vision: z.string().min(10).max(1000),
  brief: z.string().min(20),
  target_customer: z.string().min(5),
  value_prop: z.string().min(10),
  assumptions: z.array(z.object({
    statement: z.string().min(5),
    confidence: z.enum(['low', 'medium', 'high']),
    status: z.enum(['untested', 'validated', 'invalidated']).default('untested'),
    category: z.enum(['market', 'product', 'customer', 'growth'])
  })).optional(),
  constraints: z.array(z.string()).optional()
});

export const UpdateContextSchema = z.object({
  brief: z.string().min(20).optional(),
  target_customer: z.string().min(5).optional(),
  value_prop: z.string().min(10).optional(),
  assumptions: z.array(z.object({
    id: z.string(),
    statement: z.string().min(5),
    confidence: z.enum(['low', 'medium', 'high']),
    status: z.enum(['untested', 'validated', 'invalidated']),
    category: z.enum(['market', 'product', 'customer', 'growth'])
  })).optional(),
  constraints: z.array(z.string()).optional()
});

export const CreateTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  assigned_agent_id: z.string(),
  department: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  inputs: z.record(z.string(), z.any()).default({}),
  acceptance_criteria: z.array(z.string()).min(1),
  parallelizable: z.boolean().default(false),
  dependencies: z.array(z.string()).default([])
});

export const SubmitApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected', 'changes_requested']),
  feedback: z.string().optional(),
  reviewer_role: z.string().default('Founder / CEO')
});

export const ExecuteTaskSchema = z.object({
  mode: z.enum(['manual', 'mock']).default('manual'),
  output: z.record(z.string(), z.any()).optional(),
  artifact_content: z.string().optional(),
  artifact_title: z.string().optional(),
  artifact_type: z.enum(['markdown', 'document', 'dataset', 'code', 'strategy', 'analysis']).default('markdown')
});

export const CreateDecisionSchema = z.object({
  title: z.string().min(3).max(200),
  context: z.string().min(10),
  rationale: z.string().min(10),
  status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']).default('proposed'),
  decided_by: z.string().default('Founder / CEO')
});
