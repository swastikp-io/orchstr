import { Task, CompanyContext, AgentDefinition, ArtifactType } from '../shared/schemas/index.js';
import { COMPANY_ROLES } from '../agents/managers/roles.js';

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
    workspacePath: string;
  };
  acceptanceCriteria: string[];
  requiredApprovalLevel: string;
  generatedAt: string;
}

export class AntigravityExecutionAdapter {
  public prepareExecution(
    task: Task,
    context: CompanyContext,
    dependencies: TaskPacketDependency[],
    agent: AgentDefinition
  ): TaskPacket {
    const departmentManager = COMPANY_ROLES.find(r => r.id !== 'role_founder_ceo' && r.coordinated_agents.includes(agent.id));
    const managerRole = departmentManager || COMPANY_ROLES[0];

    const expectedTitle = `${task.title} - Deliverable`;
    const expectedType: ArtifactType = 'markdown';
    const slug = context.company_id.replace(/^comp_/, '');

    return {
      taskId: task.id,
      assignedAgent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        department: agent.department,
        purpose: agent.purpose,
        instructions: agent.instructions,
        outputSchema: agent.output_schema,
        permittedActions: agent.permitted_actions
      },
      companyContextReferences: {
        company_id: context.company_id,
        company_name: 'Canonical Workspace',
        brief: context.brief,
        target_customer: context.target_customer,
        value_prop: context.value_prop,
        active_assumptions: (context.assumptions || []).map(a => ({
          statement: a.statement,
          confidence: a.confidence,
          status: a.status
        })),
        constraints: context.constraints || []
      },
      dependencies,
      instructions: {
        summary: `Execute task "${task.title}" as ${agent.name} (${agent.role}).`,
        stepByStep: [
          `Review the company brief, target customer, and active assumptions.`,
          `Analyze upstream outputs: ${dependencies.map(d => `"${d.title}" (${d.status})`).join(', ') || 'None (Root task)'}.`,
          `Formulate your response adhering strictly to the role instructions and permitted actions: ${agent.permitted_actions.join(', ')}.`,
          `Validate your deliverable against each acceptance criterion before submitting.`,
          `Format the deliverable in GitHub-flavored Markdown matching the deliverable contract.`
        ],
        specialGuidance: [
          `Do not call external model APIs.`,
          `Ground every assertion in company context and predecessor artifacts.`,
          `Surface any contradictory evidence explicitly rather than resolving silently.`
        ]
      },
      outputDestination: {
        expectedTitle,
        expectedType,
        schemaSummary: 'Structured Markdown matching deliverable schema contract',
        storageTarget: `ORCHSTR Database: artifacts table (task_id: ${task.id})`,
        workspacePath: `companies/${slug}/artifacts/${task.id}.md`
      },
      acceptanceCriteria: task.acceptance_criteria.length > 0 ? task.acceptance_criteria : agent.acceptance_criteria,
      requiredApprovalLevel: managerRole.title,
      generatedAt: new Date().toISOString()
    };
  }

  public formatAntigravityPrompt(packet: TaskPacket): string {
    const depsText = packet.dependencies.length > 0
      ? packet.dependencies.map(d => `- [${d.title}] (ID: ${d.task_id}) - Status: ${d.status}\n  Artifact: ${d.artifact_title || 'N/A'}\n  Summary: ${d.artifact_summary || 'N/A'}`).join('\n')
      : 'None (Root task)';

    const assumptionsText = packet.companyContextReferences.active_assumptions.length > 0
      ? packet.companyContextReferences.active_assumptions.map(a => `- [${a.confidence.toUpperCase()} CONFIDENCE | ${a.status.toUpperCase()}] ${a.statement}`).join('\n')
      : 'No active assumptions recorded';

    const criteriaText = packet.acceptanceCriteria.map((c, i) => `${i + 1}. [ ] ${c}`).join('\n');

    return `### [ORCHSTR AGENT TASK PACKET]
**Task ID**: \`${packet.taskId}\`
**Agent**: ${packet.assignedAgent.name} (\`${packet.assignedAgent.id}\`)
**Department**: ${packet.assignedAgent.department}
**Reviewer / Approval Level**: ${packet.requiredApprovalLevel}

---
#### 1. CANONICAL COMPANY CONTEXT
- **Company Brief**: ${packet.companyContextReferences.brief}
- **Target Customer**: ${packet.companyContextReferences.target_customer}
- **Value Proposition**: ${packet.companyContextReferences.value_prop}

**Current Strategic Assumptions**:
${assumptionsText}

**Constraints**:
${packet.companyContextReferences.constraints.map(c => `- ${c}`).join('\n') || '- None specified'}

---
#### 2. PREREQUISITE DEPENDENCIES
${depsText}

---
#### 3. AGENT DIRECTIVE & INSTRUCTIONS
**Role Purpose**: ${packet.assignedAgent.purpose}
**Instructions**:
${packet.assignedAgent.instructions}

**Permitted Actions**: ${packet.assignedAgent.permittedActions.join(', ')}

---
#### 4. ACCEPTANCE CRITERIA (MANAGERIAL REVIEW CHECKLIST)
${criteriaText}

---
#### 5. OUTPUT DELIVERABLE FORMAT & DESTINATION
- Expected Title: \`${packet.outputDestination.expectedTitle}\`
- Workspace Path: \`${packet.outputDestination.workspacePath}\`
- Deliverable: Structured GitHub Flavored Markdown. Once complete, submit via the UI or local CLI bridge.
`;
  }
}
