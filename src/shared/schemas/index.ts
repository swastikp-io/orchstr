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
  output_schema: string | Record<string, any>;
  acceptance_criteria: string[];
  permitted_actions: string[];
  is_manager?: boolean;
  created_at?: string;
}

export interface RoleDefinition {
  id: string;
  title: string;
  department: string;
  mandate: string;
  coordinates: string[];
  approval_scope: string[];
  final_decision_maker: boolean;
}

export type TaskDepartment = 'strategy' | 'research' | 'growth' | 'sales' | 'product' | 'support' | 'finance' | 'operations' | 'design' | 'website';
export type TaskLabel = 'user_task' | 'agent_task' | 'needs_approval';
export type TaskStage = 'start' | 'build' | 'sell' | 'scale';

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string;
  assigned_agent_id: string;
  department: string;
  stage?: TaskStage | string;
  label?: TaskLabel | string;
  founder_move?: string;
  watch_out?: string;
  checklist?: string[];
  priority: TaskPriority;
  status: TaskStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any> | null;
  acceptance_criteria: string[];
  parallelizable: boolean;
  artifact_id?: string | null;
  error_message?: string | null;
  retry_count: number;
  max_retries?: number;
  created_at: string;
  updated_at: string;
  dependencies?: string[];
  missing_inputs?: string[] | null;
  assigned_agent?: AgentDefinition;
}

export interface TaskDependency {
  id?: string;
  company_id?: string;
  task_id: string;
  depends_on_task_id: string;
  created_at?: string;
}

export interface Artifact {
  id: string;
  company_id: string;
  task_id: string;
  title: string;
  type: ArtifactType;
  content: string;
  structured_data?: Record<string, any> | null;
  metadata?: Record<string, any>;
  version: number;
  created_at: string;
  updated_at?: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  task_id: string;
  artifact_id?: string | null;
  proposed_action?: string;
  payload?: Record<string, any>;
  reason?: string;
  expected_outcome?: string;
  affected_resources?: string[];
  requesting_agent_id?: string;
  reviewer_role: string;
  risks?: string;
  reversibility?: 'high' | 'medium' | 'low';
  status: ApprovalStatus;
  feedback?: string | null;
  audit_history?: Array<{
    timestamp: string;
    action: string;
    actor: string;
    notes?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  payload_checksum?: string;
  executed_at?: string | null;
  execution_result?: Record<string, any> | null;
  expires_at?: string | null;
  requested_at?: string;
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
  details?: Record<string, any> | null;
  payload?: Record<string, any>;
  created_at: string;
}

export interface TaskPacket {
  task_id: string;
  company_id: string;
  assigned_agent: {
    id: string;
    name: string;
    role: string;
    department: string;
    purpose: string;
    permitted_actions: string[];
  };
  company_context: {
    name: string;
    industry: string;
    vision: string;
    brief: string;
    target_customer: string;
    value_prop: string;
    assumptions: Assumption[];
    constraints: string[];
  };
  dependencies: Array<{
    task_id: string;
    title: string;
    status: TaskStatus;
    artifact_id?: string | null;
  }>;
  prerequisite_artifacts: Array<{
    task_id: string;
    title: string;
    content: string;
    structured_data?: Record<string, any> | null;
  }>;
  instructions: string;
  task_inputs: Record<string, any>;
  output_destination: {
    artifact_type: ArtifactType;
    expected_schema: Record<string, any>;
  };
  acceptance_criteria: string[];
  required_approval_level: {
    role_id: string;
    role_title: string;
    final_authority: boolean;
  };
  missing_inputs: string[];
  can_execute: boolean;
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
  stage: z.enum(['start', 'build', 'sell', 'scale']).default('start'),
  label: z.enum(['user_task', 'agent_task', 'needs_approval']).default('agent_task'),
  founder_move: z.string().optional(),
  watch_out: z.string().optional(),
  checklist: z.array(z.string()).default([]),
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
