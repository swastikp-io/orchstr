import { Task, CompanyContext, AgentDefinition, ArtifactType } from '../types.js';
import { AgentExecutionAdapter, TaskPacket, TaskPacketDependency, ExecutionResult } from './types.js';
import { COMPANY_ROLES } from '../organization.js';

export class AntigravityExecutionAdapter implements AgentExecutionAdapter {
  /**
   * Constructs an actionable task packet for Google Antigravity execution.
   */
  prepareExecution(
    task: Task,
    context: CompanyContext,
    dependencies: TaskPacketDependency[],
    agent: AgentDefinition
  ): TaskPacket {
    // Determine the required manager/approval role (prefer specific department manager over general CEO)
    const departmentManager = COMPANY_ROLES.find(r => r.id !== 'role_founder_ceo' && r.coordinated_agents.includes(agent.id));
    const managerRole = departmentManager || COMPANY_ROLES[0];
    const requiredApprovalLevel = managerRole.title;

    // Expected artifact type and title
    const expectedType: ArtifactType = 'markdown';
    const expectedTitle = `${task.title} - Deliverable`;

    const packet: TaskPacket = {
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
      dependencies: dependencies.map(dep => ({
        task_id: dep.task_id,
        title: dep.title,
        agent_name: dep.agent_name,
        status: dep.status,
        artifact_id: dep.artifact_id,
        artifact_title: dep.artifact_title,
        artifact_summary: dep.artifact_summary
      })),
      instructions: {
        summary: `Execute task: "${task.title}" as ${agent.name} (${agent.role}).`,
        stepByStep: [
          `Review the company context, especially the target customer and value proposition.`,
          `Analyze upstream deliverables from dependencies: ${dependencies.map(d => `"${d.title}" (${d.status})`).join(', ') || 'None (Initial task)'}.`,
          `Formulate your response adhering strictly to the role instructions and permitted actions: ${agent.permitted_actions.join(', ')}.`,
          `Validate your deliverable against each acceptance criterion before submitting.`,
          `Format the deliverable in GitHub-flavored Markdown with structured sections.`
        ],
        specialGuidance: [
          `Do not invent unsanctioned model APIs.`,
          `Ground every assertion in company context and predecessor artifacts.`,
          `Surface any contradictory evidence explicitly rather than resolving silently.`
        ]
      },
      outputDestination: {
        expectedTitle,
        expectedType,
        schemaSummary: `Structured Markdown matching agent output schema`,
        storageTarget: `ORCHSTR Database: artifacts table (referenced by task_id: ${task.id})`
      },
      acceptanceCriteria: task.acceptance_criteria.length > 0 ? task.acceptance_criteria : agent.acceptance_criteria,
      requiredApprovalLevel,
      generatedAt: new Date().toISOString()
    };

    return packet;
  }

  /**
   * Generates a ready-to-paste Antigravity IDE prompt from the task packet.
   */
  formatAntigravityPrompt(packet: TaskPacket): string {
    const depsText = packet.dependencies.length > 0
      ? packet.dependencies.map(d => `- [${d.title}] (ID: ${d.task_id}) - Status: ${d.status}\n  Artifact: ${d.artifact_title || 'N/A'}\n  Summary: ${d.artifact_summary || 'N/A'}`).join('\n')
      : 'None (Root task with no prerequisite tasks)';

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
#### 5. OUTPUT DELIVERABLE FORMAT
- Expected Deliverable: Structured GitHub Flavored Markdown
- Expected Title: \`${packet.outputDestination.expectedTitle}\`
- Please provide the final deliverable in markdown format. When complete, copy the markdown deliverable and submit it back to ORCHSTR to transition the task into Review status.
`;
  }

  async dispatch(packet: TaskPacket): Promise<{ packet: TaskPacket; message: string }> {
    return {
      packet,
      message: `Task packet prepared for Task ${packet.taskId}. User can run this directly in Google Antigravity.`
    };
  }

  async processResult(taskId: string, result: ExecutionResult): Promise<{ success: boolean; error?: string }> {
    if (!result.artifact && result.status === 'completed') {
      return { success: false, error: 'Completed execution result must contain an artifact deliverable.' };
    }
    return { success: true };
  }
}
