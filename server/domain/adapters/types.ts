import { Task, CompanyContext, AgentDefinition, ArtifactType } from '../types.js';

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

export interface ExecutionResult {
  taskId: string;
  status: 'completed' | 'failed';
  artifact?: {
    title: string;
    type: ArtifactType;
    content: string;
    metadata?: Record<string, any>;
  };
  outputData?: Record<string, any>;
  errorMessage?: string;
  notes?: string;
}

export interface AgentExecutionAdapter {
  prepareExecution(task: Task, context: CompanyContext, dependencies: TaskPacketDependency[], agent: AgentDefinition): TaskPacket;
  dispatch(packet: TaskPacket): Promise<{ packet: TaskPacket; message: string }>;
  processResult(taskId: string, result: ExecutionResult): Promise<{ success: boolean; error?: string }>;
}
