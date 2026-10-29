import { DatabaseSync } from 'node:sqlite';
import {
  Company, CompanyContext, Task, TaskDependency, Artifact,
  ApprovalRequest, ActivityEvent, Decision, AgentDefinition, TaskStatus
} from '../shared/schemas/index.js';
import { SPECIALIZED_AGENTS } from '../agents/definitions/agents.js';
import { COMPANY_ROLES } from '../agents/managers/roles.js';
import { DependencyAwareTaskPlanner } from './planner.js';
import { AntigravityExecutionAdapter, TaskPacket, TaskPacketDependency } from './execution-adapter.js';
import { CONTRACT_VALIDATORS } from '../agents/contracts/deliverable-contracts.js';
import { MOCK_DELIVERABLES } from '../../server/domain/adapters/mock-engine.js';
import { SafeLogger } from '../server/services/logger.js';

export class OrchestrationEngine {
  private db: DatabaseSync;
  private antigravityAdapter: AntigravityExecutionAdapter;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.antigravityAdapter = new AntigravityExecutionAdapter();
    this.syncAgentDefinitions();
  }

  public syncAgentDefinitions(): void {
    const insertStmt = this.db.prepare(`
      INSERT INTO agents (id, name, role, department, purpose, instructions, required_inputs, output_schema, acceptance_criteria, permitted_actions, is_manager, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        department = excluded.department,
        purpose = excluded.purpose,
        instructions = excluded.instructions,
        required_inputs = excluded.required_inputs,
        output_schema = excluded.output_schema,
        acceptance_criteria = excluded.acceptance_criteria,
        permitted_actions = excluded.permitted_actions,
        is_manager = excluded.is_manager
    `);

    for (const agent of SPECIALIZED_AGENTS) {
      insertStmt.run(
        agent.id,
        agent.name,
        agent.role,
        agent.department,
        agent.purpose,
        agent.instructions,
        JSON.stringify(agent.required_inputs),
        agent.output_schema,
        JSON.stringify(agent.acceptance_criteria),
        JSON.stringify(agent.permitted_actions),
        agent.is_manager ? 1 : 0,
        agent.created_at
      );
    }
  }

  // ==========================================
  // COMPANY & CONTEXT OPERATIONS
  // ==========================================

  public createCompany(data: {
    name: string;
    industry: string;
    vision: string;
    brief: string;
    target_customer: string;
    value_prop: string;
    assumptions?: Array<{ statement: string; confidence: 'low' | 'medium' | 'high'; status?: 'untested' | 'validated' | 'invalidated'; category?: 'market' | 'product' | 'customer' | 'growth' }>;
    constraints?: string[];
  }): { company: Company; context: CompanyContext } {
    const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO companies (id, name, slug, industry, vision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, data.name, slug, data.industry, data.vision, now, now);

    const assumptionsWithIds = (data.assumptions || []).map((a, i) => ({
      id: `asm_${Date.now()}_${i}`,
      statement: a.statement,
      confidence: a.confidence,
      status: a.status || 'untested',
      category: a.category || 'market'
    }));

    const contextId = `ctx_${companyId}`;
    this.db.prepare(`
      INSERT INTO company_context (id, company_id, brief, target_customer, value_prop, assumptions, constraints, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contextId,
      companyId,
      data.brief,
      data.target_customer,
      data.value_prop,
      JSON.stringify(assumptionsWithIds),
      JSON.stringify(data.constraints || []),
      now,
      now
    );

    this.logActivity(companyId, 'company', companyId, 'company_created', 'Founder / CEO', `Created workspace for ${data.name}`, { name: data.name });

    return {
      company: { id: companyId, name: data.name, slug, industry: data.industry, vision: data.vision, created_at: now, updated_at: now },
      context: { id: contextId, company_id: companyId, brief: data.brief, target_customer: data.target_customer, value_prop: data.value_prop, assumptions: assumptionsWithIds, constraints: data.constraints || [], created_at: now, updated_at: now }
    };
  }

  public getCompany(companyId: string): { company: Company; context: CompanyContext } | null {
    const compRow = this.db.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId) as any;
    if (!compRow) return null;

    const ctxRow = this.db.prepare(`SELECT * FROM company_context WHERE company_id = ?`).get(companyId) as any;
    const context: CompanyContext = ctxRow ? {
      id: ctxRow.id,
      company_id: ctxRow.company_id,
      brief: ctxRow.brief,
      target_customer: ctxRow.target_customer,
      value_prop: ctxRow.value_prop,
      assumptions: JSON.parse(ctxRow.assumptions || '[]'),
      constraints: JSON.parse(ctxRow.constraints || '[]'),
      created_at: ctxRow.created_at,
      updated_at: ctxRow.updated_at
    } : {
      id: `ctx_${companyId}`,
      company_id: companyId,
      brief: '',
      target_customer: '',
      value_prop: '',
      assumptions: [],
      constraints: [],
      created_at: compRow.created_at,
      updated_at: compRow.updated_at
    };

    return { company: compRow as Company, context };
  }

  public listCompanies(): Company[] {
    const rows = this.db.prepare(`SELECT * FROM companies ORDER BY created_at ASC`).all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      industry: r.industry,
      vision: r.vision,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  public updateCompanyContext(companyId: string, updates: Partial<CompanyContext>): CompanyContext {
    const existing = this.getCompany(companyId);
    if (!existing) throw new Error(`Company ${companyId} not found.`);

    const now = new Date().toISOString();
    const updatedBrief = updates.brief ?? existing.context.brief;
    const updatedTarget = updates.target_customer ?? existing.context.target_customer;
    const updatedValueProp = updates.value_prop ?? existing.context.value_prop;
    const updatedAssumptions = updates.assumptions ?? existing.context.assumptions;
    const updatedConstraints = updates.constraints ?? existing.context.constraints;

    this.db.prepare(`
      UPDATE company_context
      SET brief = ?, target_customer = ?, value_prop = ?, assumptions = ?, constraints = ?, updated_at = ?
      WHERE company_id = ?
    `).run(
      updatedBrief,
      updatedTarget,
      updatedValueProp,
      JSON.stringify(updatedAssumptions),
      JSON.stringify(updatedConstraints),
      now,
      companyId
    );

    this.logActivity(companyId, 'company', companyId, 'context_updated', 'Founder / CEO', 'Updated company strategic context and assumptions', { fields: Object.keys(updates) });

    return {
      id: existing.context.id,
      company_id: companyId,
      brief: updatedBrief,
      target_customer: updatedTarget,
      value_prop: updatedValueProp,
      assumptions: updatedAssumptions,
      constraints: updatedConstraints,
      created_at: existing.context.created_at,
      updated_at: now
    };
  }

  // ==========================================
  // DECISION OPERATIONS
  // ==========================================

  public createDecision(companyId: string, data: {
    title: string;
    context: string;
    rationale: string;
    status?: 'proposed' | 'accepted' | 'rejected' | 'superseded';
    decided_by?: string;
  }): Decision {
    const id = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const status = data.status || 'proposed';
    const decided_by = data.decided_by || 'Founder / CEO';

    this.db.prepare(`
      INSERT INTO decisions (id, company_id, title, context, rationale, status, decided_by, decided_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, companyId, data.title, data.context, data.rationale, status, decided_by, status === 'accepted' ? now : null, now);

    this.logActivity(companyId, 'decision', id, 'decision_recorded', decided_by, `Recorded strategic decision: "${data.title}"`, { status });

    return {
      id,
      company_id: companyId,
      title: data.title,
      context: data.context,
      rationale: data.rationale,
      status,
      decided_by,
      decided_at: status === 'accepted' ? now : null,
      created_at: now
    };
  }

  public listDecisions(companyId: string): Decision[] {
    const rows = this.db.prepare(`SELECT * FROM decisions WHERE company_id = ? ORDER BY created_at DESC`).all(companyId) as any[];
    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      title: r.title,
      context: r.context,
      rationale: r.rationale,
      status: r.status,
      decided_by: r.decided_by,
      decided_at: r.decided_at,
      created_at: r.created_at
    }));
  }

  // ==========================================
  // TASK MANAGEMENT & DAG ORCHESTRATION
  // ==========================================

  public createTask(companyId: string, data: {
    id?: string;
    title: string;
    description: string;
    assigned_agent_id: string;
    department: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    inputs?: Record<string, any>;
    acceptance_criteria: string[];
    parallelizable?: boolean;
    dependencies?: string[];
  }): Task {
    const taskId = data.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const priority = data.priority || 'medium';
    const inputs = data.inputs || {};
    const parallelizable = data.parallelizable ? 1 : 0;

    const agent = SPECIALIZED_AGENTS.find(a => a.id === data.assigned_agent_id);
    if (!agent) throw new Error(`Agent ${data.assigned_agent_id} does not exist.`);

    const companyData = this.getCompany(companyId);
    if (!companyData) throw new Error(`Company ${companyId} does not exist.`);

    this.db.prepare(`
      INSERT INTO tasks (id, company_id, title, description, assigned_agent_id, department, status, priority, inputs, outputs, acceptance_criteria, parallelizable, retry_count, max_retries, missing_inputs, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, NULL, ?, ?, 0, 3, '[]', ?, ?)
    `).run(
      taskId, companyId, data.title, data.description, data.assigned_agent_id,
      data.department, priority, JSON.stringify(inputs), JSON.stringify(data.acceptance_criteria),
      parallelizable, now, now
    );

    if (data.dependencies && data.dependencies.length > 0) {
      const insertDep = this.db.prepare(`
        INSERT INTO task_dependencies (id, company_id, task_id, depends_on_task_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const depTaskId of data.dependencies) {
        const depId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        insertDep.run(depId, companyId, taskId, depTaskId, now);
      }
    }

    const allTasks = this.listTasks(companyId);
    const allDeps = this.listTaskDependencies(companyId);

    const validation = DependencyAwareTaskPlanner.validateGraph(allTasks, allDeps);
    if (!validation.isValid) {
      this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);
      throw new Error(`Cannot create task: Cycle detected in task dependency graph (${validation.cycle?.join(' -> ')})`);
    }

    const currentTask = allTasks.find(t => t.id === taskId)!;
    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(
      currentTask, allTasks, allDeps, companyData.context, agent
    );

    const initialStatus: TaskStatus = readiness.isBlocked ? 'blocked' : 'queued';
    this.db.prepare(`UPDATE tasks SET status = ?, missing_inputs = ? WHERE id = ?`).run(
      initialStatus, JSON.stringify(readiness.missingInputs), taskId
    );

    this.logActivity(
      companyId, 'task', taskId, 'task_created', 'System Planner',
      `Created task "${data.title}" assigned to ${agent.name} [Status: ${initialStatus}]`,
      { status: initialStatus, isBlocked: readiness.isBlocked }
    );

    return {
      ...currentTask,
      status: initialStatus,
      missing_inputs: readiness.missingInputs,
      dependencies: data.dependencies || []
    };
  }

  public listTasks(companyId: string): Task[] {
    const rows = this.db.prepare(`
      SELECT t.*, a.id as art_id
      FROM tasks t
      LEFT JOIN artifacts a ON a.task_id = t.id
      WHERE t.company_id = ?
      ORDER BY t.created_at ASC
    `).all(companyId) as any[];

    const depRows = this.db.prepare(`
      SELECT task_id, depends_on_task_id FROM task_dependencies WHERE company_id = ?
    `).all(companyId) as any[];

    const depMap = new Map<string, string[]>();
    for (const d of depRows) {
      if (!depMap.has(d.task_id)) depMap.set(d.task_id, []);
      depMap.get(d.task_id)!.push(d.depends_on_task_id);
    }

    return rows.map(r => {
      const agent = SPECIALIZED_AGENTS.find(a => a.id === r.assigned_agent_id);
      return {
        id: r.id,
        company_id: r.company_id,
        title: r.title,
        description: r.description,
        assigned_agent_id: r.assigned_agent_id,
        department: r.department,
        status: r.status as TaskStatus,
        priority: r.priority,
        inputs: JSON.parse(r.inputs || '{}'),
        outputs: r.outputs ? JSON.parse(r.outputs) : null,
        acceptance_criteria: JSON.parse(r.acceptance_criteria || '[]'),
        parallelizable: r.parallelizable === 1,
        retry_count: r.retry_count,
        max_retries: r.max_retries,
        missing_inputs: r.missing_inputs ? JSON.parse(r.missing_inputs) : [],
        created_at: r.created_at,
        updated_at: r.updated_at,
        dependencies: depMap.get(r.id) || [],
        assigned_agent: agent,
        artifact_id: r.art_id
      };
    });
  }

  public getTask(companyId: string, taskId: string): Task | null {
    const tasks = this.listTasks(companyId);
    return tasks.find(t => t.id === taskId) || null;
  }

  public listTaskDependencies(companyId: string): TaskDependency[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE company_id = ?
    `).all(companyId) as any[];
    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      task_id: r.task_id,
      depends_on_task_id: r.depends_on_task_id,
      created_at: r.created_at
    }));
  }

  public recalculateTaskStatuses(companyId: string): { unblockedTaskIds: string[] } {
    const company = this.getCompany(companyId);
    if (!company) return { unblockedTaskIds: [] };

    const tasks = this.listTasks(companyId);
    const deps = this.listTaskDependencies(companyId);
    const unblockedTaskIds: string[] = [];

    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'approved' || task.status === 'running' || task.status === 'review') {
        continue;
      }

      const agent = SPECIALIZED_AGENTS.find(a => a.id === task.assigned_agent_id);
      if (!agent) continue;

      const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(task, tasks, deps, company.context, agent);

      if (task.status === 'blocked' && readiness.isReady) {
        this.db.prepare(`UPDATE tasks SET status = 'queued', missing_inputs = '[]' WHERE id = ?`).run(task.id);
        unblockedTaskIds.push(task.id);
        this.logActivity(
          companyId, 'task', task.id, 'task_unblocked', 'System Orchestrator',
          `Prerequisites satisfied. Task "${task.title}" unblocked into QUEUED.`,
          { previousStatus: 'blocked', newStatus: 'queued' }
        );
      } else if (task.status === 'queued' && readiness.isBlocked) {
        this.db.prepare(`UPDATE tasks SET status = 'blocked', missing_inputs = ? WHERE id = ?`).run(
          JSON.stringify(readiness.missingInputs), task.id
        );
      }
    }

    return { unblockedTaskIds };
  }

  public getTaskPacket(companyId: string, taskId: string): { packet: TaskPacket; promptMarkdown: string } {
    const company = this.getCompany(companyId);
    if (!company) throw new Error(`Company ${companyId} not found.`);

    const task = this.getTask(companyId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    const agent = SPECIALIZED_AGENTS.find(a => a.id === task.assigned_agent_id);
    if (!agent) throw new Error(`Agent ${task.assigned_agent_id} not found.`);

    const deps = this.listTaskDependencies(companyId).filter(d => d.task_id === taskId);
    const allTasks = this.listTasks(companyId);
    const artifacts = this.listArtifacts(companyId);

    const taskPacketDeps: TaskPacketDependency[] = deps.map(dep => {
      const prereqTask = allTasks.find(t => t.id === dep.depends_on_task_id);
      const prereqArtifact = artifacts.find(a => a.task_id === dep.depends_on_task_id);
      const prereqAgent = prereqTask ? SPECIALIZED_AGENTS.find(a => a.id === prereqTask.assigned_agent_id) : undefined;

      return {
        task_id: dep.depends_on_task_id,
        title: prereqTask?.title || 'Unknown Task',
        agent_name: prereqAgent?.name || 'Specialist',
        status: prereqTask?.status || 'unknown',
        artifact_id: prereqArtifact?.id,
        artifact_title: prereqArtifact?.title,
        artifact_summary: prereqArtifact ? prereqArtifact.content.substring(0, 200) + '...' : undefined
      };
    });

    const packet = this.antigravityAdapter.prepareExecution(task, company.context, taskPacketDeps, agent);
    const promptMarkdown = this.antigravityAdapter.formatAntigravityPrompt(packet);

    return { packet, promptMarkdown };
  }

  public retryTask(companyId: string, taskId: string): Task {
    const task = this.getTask(companyId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    if (task.retry_count >= task.max_retries) {
      throw new Error(`Task ${taskId} has exceeded max retries (${task.max_retries}).`);
    }

    const company = this.getCompany(companyId);
    if (!company) throw new Error(`Company ${companyId} not found.`);

    const allTasks = this.listTasks(companyId);
    const allDeps = this.listTaskDependencies(companyId);
    const agent = SPECIALIZED_AGENTS.find(a => a.id === task.assigned_agent_id)!;

    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(task, allTasks, allDeps, company.context, agent);
    const nextStatus: TaskStatus = readiness.isReady ? 'queued' : 'blocked';
    const newRetryCount = task.retry_count + 1;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE tasks SET status = ?, retry_count = ?, updated_at = ? WHERE id = ?
    `).run(nextStatus, newRetryCount, now, taskId);

    this.logActivity(
      companyId, 'task', taskId, 'task_retried', 'Operator',
      `Retried task "${task.title}" (Attempt ${newRetryCount} of ${task.max_retries}) [Status: ${nextStatus}]`,
      { retry_count: newRetryCount, status: nextStatus }
    );

    return this.getTask(companyId, taskId)!;
  }

  public executeTask(companyId: string, taskId: string, options: {
    mode?: 'manual' | 'mock';
    outputData?: Record<string, any>;
    artifactContent?: string;
    artifactTitle?: string;
    artifactType?: string;
  }): { task: Task; artifact: Artifact; approvalRequest: ApprovalRequest } {
    const task = this.getTask(companyId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found in workspace.`);

    const company = this.getCompany(companyId);
    if (!company) throw new Error(`Company ${companyId} not found.`);

    const agent = SPECIALIZED_AGENTS.find(a => a.id === task.assigned_agent_id);
    if (!agent) throw new Error(`Agent ${task.assigned_agent_id} not found.`);

    const allTasks = this.listTasks(companyId);
    const allDeps = this.listTaskDependencies(companyId);
    const readiness = DependencyAwareTaskPlanner.evaluateTaskReadiness(task, allTasks, allDeps, company.context, agent);

    if (readiness.isBlocked) {
      throw new Error(`Cannot execute task: Prerequisites are not yet satisfied (${readiness.blockingDependencies.map(d => `${d.title} [${d.status}]`).join(', ')})`);
    }

    const { packet } = this.getTaskPacket(companyId, taskId);
    const now = new Date().toISOString();

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.prepare(`
      INSERT INTO agent_runs (id, company_id, task_id, agent_id, status, input_packet, started_at)
      VALUES (?, ?, ?, ?, 'started', ?, ?)
    `).run(runId, companyId, taskId, agent.id, JSON.stringify(packet), now);

    this.db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`).run(now, taskId);

    let finalTitle = options.artifactTitle;
    let finalType: any = options.artifactType || 'markdown';
    let finalContent = options.artifactContent || '';
    let finalOutputData = options.outputData || {};

    if (options.mode === 'mock' || !finalContent) {
      const mock = MOCK_DELIVERABLES[agent.id];
      if (mock) {
        finalTitle = finalTitle || mock.title;
        finalType = mock.type;
        finalContent = finalContent || mock.content;
        finalOutputData = { ...mock.outputData, ...finalOutputData };
      } else {
        finalTitle = finalTitle || `${task.title} - Deliverable`;
        finalContent = finalContent || `# Deliverable for ${task.title}\n\nGenerated by ${agent.name}.`;
      }
    }

    // Upsert artifact safely without duplicates
    const existingArtifact = this.db.prepare(`SELECT * FROM artifacts WHERE task_id = ?`).get(taskId) as any;
    let artifactId: string;
    let version = 1;

    if (existingArtifact) {
      artifactId = existingArtifact.id;
      version = existingArtifact.version + 1;
      this.db.prepare(`
        UPDATE artifacts SET title = ?, type = ?, content = ?, metadata = ?, version = ?, created_at = ?
        WHERE id = ?
      `).run(finalTitle!, finalType, finalContent, JSON.stringify(finalOutputData), version, now, artifactId);
    } else {
      artifactId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO artifacts (id, company_id, task_id, title, type, content, metadata, version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(artifactId, companyId, taskId, finalTitle!, finalType, finalContent, JSON.stringify(finalOutputData), version, now);
    }

    this.db.prepare(`
      UPDATE agent_runs SET status = 'completed', output_result = ?, completed_at = ? WHERE id = ?
    `).run(JSON.stringify(finalOutputData), now, runId);

    this.db.prepare(`
      UPDATE tasks SET status = 'review', outputs = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(finalOutputData), now, taskId);

    const departmentManager = COMPANY_ROLES.find(r => r.id !== 'role_founder_ceo' && r.coordinated_agents.includes(agent.id));
    const managerRole = departmentManager || COMPANY_ROLES[0];
    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    this.db.prepare(`DELETE FROM approval_requests WHERE task_id = ? AND status = 'pending'`).run(taskId);

    this.db.prepare(`
      INSERT INTO approval_requests (id, company_id, task_id, artifact_id, reviewer_role, status, requested_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(approvalId, companyId, taskId, artifactId, managerRole.title, now);

    this.logActivity(companyId, 'artifact', artifactId, 'artifact_produced', agent.name, `Produced deliverable "${finalTitle}" for review by ${managerRole.title}`);
    this.logActivity(companyId, 'approval', approvalId, 'approval_requested', agent.name, `Requested review from ${managerRole.title} for task "${task.title}"`);

    return {
      task: this.getTask(companyId, taskId)!,
      artifact: {
        id: artifactId,
        company_id: companyId,
        task_id: taskId,
        title: finalTitle!,
        type: finalType,
        content: finalContent,
        metadata: finalOutputData,
        version,
        created_at: now
      },
      approvalRequest: {
        id: approvalId,
        company_id: companyId,
        task_id: taskId,
        artifact_id: artifactId,
        reviewer_role: managerRole.title,
        status: 'pending',
        requested_at: now
      }
    };
  }

  // ==========================================
  // APPROVALS
  // ==========================================

  public submitApproval(companyId: string, approvalId: string, data: {
    status: 'approved' | 'rejected' | 'changes_requested';
    feedback?: string;
    reviewer_role?: string;
  }): { approval: ApprovalRequest; task: Task; unblockedTaskIds: string[] } {
    const apprRow = this.db.prepare(`SELECT * FROM approval_requests WHERE id = ? AND company_id = ?`).get(approvalId, companyId) as any;
    if (!apprRow) throw new Error(`Approval request ${approvalId} not found in workspace.`);

    const now = new Date().toISOString();
    const reviewerRole = data.reviewer_role || apprRow.reviewer_role;

    this.db.prepare(`
      UPDATE approval_requests SET status = ?, feedback = ?, reviewed_at = ?, reviewer_role = ? WHERE id = ?
    `).run(data.status, data.feedback || null, now, reviewerRole, approvalId);

    const task = this.getTask(companyId, apprRow.task_id);
    if (!task) throw new Error(`Task ${apprRow.task_id} not found.`);

    let unblockedTaskIds: string[] = [];

    if (data.status === 'approved') {
      this.db.prepare(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`).run(now, task.id);
      this.logActivity(companyId, 'approval', approvalId, 'approval_accepted', reviewerRole, `Approved deliverable for "${task.title}". Task marked COMPLETED.`);

      const recalc = this.recalculateTaskStatuses(companyId);
      unblockedTaskIds = recalc.unblockedTaskIds;
    } else {
      const newStatus = data.status === 'changes_requested' ? 'queued' : 'failed';
      this.db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`).run(newStatus, now, task.id);
      this.logActivity(companyId, 'approval', approvalId, `approval_${data.status}`, reviewerRole, `${data.status === 'changes_requested' ? 'Changes requested for' : 'Rejected'} deliverable on "${task.title}"`);
    }

    return {
      approval: {
        id: approvalId,
        company_id: companyId,
        task_id: apprRow.task_id,
        artifact_id: apprRow.artifact_id,
        reviewer_role: reviewerRole,
        status: data.status,
        feedback: data.feedback,
        requested_at: apprRow.requested_at,
        reviewed_at: now
      },
      task: this.getTask(companyId, task.id)!,
      unblockedTaskIds
    };
  }

  public listApprovals(companyId: string): ApprovalRequest[] {
    const rows = this.db.prepare(`
      SELECT ar.*, t.title as task_title, a.title as artifact_title
      FROM approval_requests ar
      LEFT JOIN tasks t ON t.id = ar.task_id
      LEFT JOIN artifacts a ON a.id = ar.artifact_id
      WHERE ar.company_id = ?
      ORDER BY ar.requested_at DESC
    `).all(companyId) as any[];

    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      task_id: r.task_id,
      artifact_id: r.artifact_id,
      reviewer_role: r.reviewer_role,
      status: r.status,
      feedback: r.feedback,
      requested_at: r.requested_at,
      reviewed_at: r.reviewed_at,
      task_title: r.task_title,
      artifact_title: r.artifact_title
    }));
  }

  // ==========================================
  // ARTIFACTS & ACTIVITY
  // ==========================================

  public listArtifacts(companyId: string): Artifact[] {
    const rows = this.db.prepare(`SELECT * FROM artifacts WHERE company_id = ? ORDER BY created_at DESC`).all(companyId) as any[];
    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      task_id: r.task_id,
      title: r.title,
      type: r.type,
      content: r.content,
      metadata: JSON.parse(r.metadata || '{}'),
      version: r.version,
      created_at: r.created_at
    }));
  }

  public getArtifact(companyId: string, artifactId: string): Artifact | null {
    const row = this.db.prepare(`SELECT * FROM artifacts WHERE id = ? AND company_id = ?`).get(artifactId, companyId) as any;
    if (!row) return null;
    return {
      id: row.id,
      company_id: row.company_id,
      task_id: row.task_id,
      title: row.title,
      type: row.type,
      content: row.content,
      metadata: JSON.parse(row.metadata || '{}'),
      version: row.version,
      created_at: row.created_at
    };
  }

  public logActivity(
    companyId: string,
    entityType: any,
    entityId: string,
    eventType: string,
    actor: string,
    summary: string,
    payload: Record<string, any> = {}
  ): ActivityEvent {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO activity_events (id, company_id, entity_type, entity_id, event_type, actor, summary, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, companyId, entityType, entityId, eventType, actor, summary, JSON.stringify(payload), now);

    return {
      id,
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      actor,
      summary,
      payload,
      created_at: now
    };
  }

  public listActivity(companyId: string, limit = 50): ActivityEvent[] {
    const rows = this.db.prepare(`SELECT * FROM activity_events WHERE company_id = ? ORDER BY created_at DESC LIMIT ?`).all(companyId, limit) as any[];
    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      event_type: r.event_type,
      actor: r.actor,
      summary: r.summary,
      payload: JSON.parse(r.payload || '{}'),
      created_at: r.created_at
    }));
  }
}
