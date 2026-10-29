import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseSync } from 'node:sqlite';
import { OrchestrationEngine } from '../orchestration/orchestrator.js';
import { ApprovalEngine, ConsequentialActionType } from '../server/approvals/approval-engine.js';
import { SharedMemoryManager } from '../memory/shared-memory.js';
import { OperationalReviewService } from '../server/services/review-service.js';
import { BackupService } from '../db/backup.js';
import { resolveDbPath } from '../db/connection.js';
import { CONTRACT_VALIDATORS } from '../agents/contracts/deliverable-contracts.js';
import { renderDeliverableMarkdown } from '../agents/contracts/markdown-renderer.js';
import { calculateUnitEconomics } from '../server/services/unit-economics.js';
import { SafeLogger } from '../server/services/logger.js';
import { SPECIALIZED_AGENTS } from '../agents/definitions/agents.js';

export function registerMcpTools(server: McpServer, db: DatabaseSync): void {
  const orchestrator = new OrchestrationEngine(db);
  const approvalEngine = new ApprovalEngine(db);
  const sharedMemory = new SharedMemoryManager(db);
  const reviewService = new OperationalReviewService(db);
  const backupService = new BackupService(resolveDbPath());

  function successResponse(data: any) {
    return {
      content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }]
    };
  }

  function errorResponse(message: string, details?: any) {
    SafeLogger.error(`[MCP Tool Error] ${message}`, details);
    return {
      isError: true,
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: message,
          details: details || null,
          status: 'failed'
        }, null, 2)
      }]
    };
  }

  // 1. init_company
  server.tool(
    'init_company',
    'One-shot bootstrap that creates the workspace, canonical brief, assumptions ledger, and generates the task plan (default template: founder-guide).',
    {
      name: z.string().min(2).describe('Name of the company or venture'),
      idea: z.string().min(10).describe('Startup idea, mission, or problem statement'),
      industry: z.string().optional().describe('Industry or vertical (e.g. B2B SaaS, HealthTech)'),
      target_customer: z.string().optional().describe('Initial target customer profile'),
      value_prop: z.string().optional().describe('Core value proposition or differentiator'),
      template: z.enum(['founder-guide', 'canonical-7']).optional().default('founder-guide').describe('Task plan roadmap template')
    },
    async (args) => {
      try {
        const ind = args.industry || 'Technology';
        const target = args.target_customer || 'Early adopters facing acute workflow friction';
        const valProp = args.value_prop || args.idea;

        const initialAssumptions = [
          {
            statement: `Customers in ${ind} currently experience severe friction addressing: ${args.idea.slice(0, 120)}`,
            confidence: 'medium' as const,
            status: 'untested' as const,
            category: 'customer' as const
          },
          {
            statement: `Willingness to pay exists for an automated, high-leverage solution over manual workarounds.`,
            confidence: 'medium' as const,
            status: 'untested' as const,
            category: 'market' as const
          }
        ];

        const { company, context } = orchestrator.createCompany({
          name: args.name,
          industry: ind,
          vision: args.idea,
          brief: `${args.name}: ${args.idea}\n\nTarget Customer: ${target}\nValue Proposition: ${valProp}`,
          target_customer: target,
          value_prop: valProp,
          assumptions: initialAssumptions,
          constraints: ['Zero fabricated data', 'Human approval required for consequential actions']
        });

        // Seed initial evidence
        sharedMemory.addEvidence(company.id, {
          statement: `Initial venture thesis: ${args.idea}`,
          source: 'Founder Briefing',
          evidence_type: 'hypothesis',
          confidence: 'medium',
          author_agent_id: 'system',
          tags: ['initial_thesis', 'vision']
        });

        // Generate the roadmap plan
        const { tasks, template } = orchestrator.generatePlan(company.id, args.template || 'founder-guide');

        const readyTasks = tasks.filter(t => t.status === 'queued' && t.label !== 'user_task');
        const firstReady = orchestrator.getNextReadyTask(company.id);

        let firstReadyPacket: any = null;
        if (firstReady) {
          const packetData = orchestrator.getTaskPacket(company.id, firstReady.id);
          firstReadyPacket = {
            task_id: firstReady.id,
            title: firstReady.title,
            department: firstReady.department,
            assigned_agent_id: firstReady.assigned_agent_id,
            card: {
              founder_move: firstReady.founder_move,
              watch_out: firstReady.watch_out,
              checklist: firstReady.checklist
            },
            packet: packetData.packet,
            prompt_markdown: packetData.promptMarkdown
          };
        }

        return successResponse({
          company_id: company.id,
          company_name: company.name,
          brief: context.brief,
          plan_summary: {
            template,
            total_tasks: tasks.length,
            ready_tasks: readyTasks.length,
            blocked_tasks: tasks.filter(t => t.status === 'blocked').length
          },
          first_ready_task: firstReadyPacket
        });
      } catch (err: any) {
        return errorResponse(`Failed to initialize company: ${err.message}`, err.stack);
      }
    }
  );

  // 2. list_companies
  server.tool(
    'list_companies',
    'List all registered company workspaces.',
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const companies = orchestrator.listCompanies();
        return successResponse({ count: companies.length, companies });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 3. get_company_overview
  server.tool(
    'get_company_overview',
    'Get strategic overview of a company including context, task statuses, and pending approvals.',
    {
      company_id: z.string().describe('Company workspace ID')
    },
    { readOnlyHint: true },
    async ({ company_id }) => {
      try {
        const comp = orchestrator.getCompany(company_id);
        if (!comp) return errorResponse(`Company ${company_id} not found.`);

        const tasks = orchestrator.listTasks(company_id);
        const approvals = approvalEngine.listApprovals(company_id);
        const pendingApprovals = approvals.filter(a => a.status === 'pending');
        const memory = sharedMemory.getMemory(company_id);
        const decisions = orchestrator.listDecisions(company_id);

        const statusCounts = tasks.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const stageCounts = tasks.reduce((acc, t) => {
          const s = t.stage || 'start';
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return successResponse({
          company: comp.company,
          context: comp.context,
          task_summary: {
            total: tasks.length,
            by_status: statusCounts,
            by_stage: stageCounts
          },
          pending_approvals_count: pendingApprovals.length,
          evidence_count: memory.evidence_ledger.length,
          decisions_count: decisions.length,
          has_approved_positioning: !!memory.approved_positioning
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 4. generate_plan
  server.tool(
    'generate_plan',
    'Generate a deterministic DAG task roadmap for a company workspace.',
    {
      company_id: z.string().describe('Company workspace ID'),
      template: z.enum(['founder-guide', 'canonical-7']).optional().default('founder-guide').describe('Roadmap template')
    },
    async ({ company_id, template }) => {
      try {
        const result = orchestrator.generatePlan(company_id, template || 'founder-guide');
        return successResponse({
          template: result.template,
          total_tasks: result.tasks.length,
          tasks: result.tasks.map(t => ({
            id: t.id,
            title: t.title,
            department: t.department,
            stage: t.stage,
            label: t.label,
            status: t.status,
            assigned_agent_id: t.assigned_agent_id,
            dependencies: t.dependencies
          }))
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 5. get_next_task
  server.tool(
    'get_next_task',
    'Get the next unblocked ready task packet with pre-loaded company context, approved positioning, evidence, and deliverable contract schema.',
    {
      company_id: z.string().describe('Company workspace ID'),
      agent_id: z.string().optional().describe('Optional filter by specialist agent ID')
    },
    { readOnlyHint: true },
    async ({ company_id, agent_id }) => {
      try {
        const nextTask = orchestrator.getNextReadyTask(company_id, agent_id);
        if (!nextTask) {
          const allTasks = orchestrator.listTasks(company_id);
          return successResponse({
            has_ready_task: false,
            message: 'No tasks currently ready for execution. Dependent tasks are waiting on prerequisite deliverables or founder approvals.',
            status_counts: {
              queued: allTasks.filter(t => t.status === 'queued').length,
              blocked: allTasks.filter(t => t.status === 'blocked').length,
              review: allTasks.filter(t => t.status === 'review').length,
              completed: allTasks.filter(t => t.status === 'completed').length
            }
          });
        }

        const { packet, promptMarkdown } = orchestrator.getTaskPacket(company_id, nextTask.id);
        const memory = sharedMemory.getMemory(company_id);

        const agentDef = SPECIALIZED_AGENTS.find(a => a.id === nextTask.assigned_agent_id);

        return successResponse({
          has_ready_task: true,
          task_id: nextTask.id,
          title: nextTask.title,
          description: nextTask.description,
          department: nextTask.department,
          stage: nextTask.stage,
          label: nextTask.label,
          priority: nextTask.priority,
          assigned_agent: {
            id: agentDef?.id || nextTask.assigned_agent_id,
            name: agentDef?.name || 'Specialist',
            role: agentDef?.role || 'Specialist'
          },
          card: {
            founder_move: nextTask.founder_move || '',
            watch_out: nextTask.watch_out || '',
            checklist: nextTask.checklist || []
          },
          preloaded_context: {
            brief: memory.brief,
            target_customer: memory.target_customer,
            value_prop: memory.value_prop,
            approved_positioning: memory.approved_positioning || null,
            evidence_count: memory.evidence_ledger.length,
            recent_evidence: memory.evidence_ledger.slice(0, 5)
          },
          acceptance_criteria: nextTask.acceptance_criteria,
          deliverable_output_schema: agentDef?.output_schema || '{}',
          prompt_markdown: promptMarkdown
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 6. list_tasks
  server.tool(
    'list_tasks',
    'List tasks for a company with optional status, department, and label filters.',
    {
      company_id: z.string().describe('Company workspace ID'),
      status: z.enum(['queued', 'running', 'blocked', 'review', 'approved', 'completed', 'failed']).optional(),
      department: z.string().optional(),
      label: z.string().optional(),
      stage: z.string().optional()
    },
    { readOnlyHint: true },
    async ({ company_id, status, department, label, stage }) => {
      try {
        let tasks = orchestrator.listTasks(company_id);
        if (status) tasks = tasks.filter(t => t.status === status);
        if (department) tasks = tasks.filter(t => t.department.toLowerCase() === department.toLowerCase());
        if (label) tasks = tasks.filter(t => t.label === label);
        if (stage) tasks = tasks.filter(t => t.stage === stage);

        return successResponse({
          count: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            department: t.department,
            stage: t.stage,
            label: t.label,
            status: t.status,
            priority: t.priority,
            assigned_agent_id: t.assigned_agent_id,
            artifact_id: t.artifact_id,
            dependencies: t.dependencies,
            founder_move: t.founder_move
          }))
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 7. submit_task
  server.tool(
    'submit_task',
    'Submit structured JSON deliverable for a task. Validates against agent contract schema, renders markdown, stores both, moves task to review/completed, and unblocks downstream tasks.',
    {
      company_id: z.string().describe('Company workspace ID'),
      task_id: z.string().describe('Task ID to submit deliverable for'),
      payload: z.record(z.string(), z.any()).describe('Structured JSON matching the agent deliverable contract schema'),
      title: z.string().optional().describe('Optional custom deliverable title')
    },
    async ({ company_id, task_id, payload, title }) => {
      try {
        const task = orchestrator.getTask(company_id, task_id);
        if (!task) return errorResponse(`Task ${task_id} not found in workspace.`);

        // Special handling for unit economics: compute formulas deterministically
        let validatedPayload = payload;
        if (task.assigned_agent_id === 'agent_unit_economics') {
          const rawInputs = payload.reported_inputs || payload;
          const computed = calculateUnitEconomics(rawInputs);
          validatedPayload = {
            reported_inputs: rawInputs,
            calculated_metrics: {
              logo_churn_rate: computed.logo_churn_rate,
              revenue_churn_rate: computed.revenue_churn_rate,
              average_customer_lifetime_months: computed.average_customer_lifetime_months,
              arpu_monthly: computed.arpu_monthly,
              ltv: computed.ltv,
              gross_margin_ltv: computed.gross_margin_ltv,
              cac: computed.cac,
              ltv_to_cac_ratio: computed.ltv_to_cac_ratio,
              payback_period_months: computed.payback_period_months
            },
            missing_inputs: computed.missing_inputs,
            analysis_notes: computed.notes.length > 0 ? computed.notes : ['Deterministic unit economics computed successfully.']
          };
        }

        // Validate payload against agent contract schema
        const validator = CONTRACT_VALIDATORS[task.assigned_agent_id];
        if (validator) {
          const parseResult = validator.safeParse(validatedPayload);
          if (!parseResult.success) {
            const readableIssues = parseResult.error.issues.map(i => {
              const pathStr = i.path.join('.') || 'root';
              return `[${pathStr}]: ${i.message}`;
            });

            return errorResponse(
              `Validation failed against ${task.assigned_agent_id} deliverable contract. Correct the following issues and resubmit in the same turn:`,
              {
                accepted: false,
                validation_issues: readableIssues,
                expected_contract: task.assigned_agent_id
              }
            );
          }
        }

        // Render markdown from structured deliverable
        const renderedMarkdown = renderDeliverableMarkdown(task.assigned_agent_id, validatedPayload);
        const artifactTitle = title || `${task.title} Deliverable`;

        // Execute task submission
        const result = orchestrator.executeTask(company_id, task_id, {
          mode: 'manual',
          outputData: validatedPayload,
          artifactContent: renderedMarkdown,
          artifactTitle,
          artifactType: 'markdown'
        });

        // Determine if task moves directly to completed (if not needs_approval and not requiring manual approval)
        let newlyUnblocked: string[] = [];
        if (task.label !== 'needs_approval') {
          // Complete automatically and unblock downstream
          const approval = db.prepare(`SELECT id FROM approval_requests WHERE task_id = ? AND status = 'pending'`).get(task_id) as any;
          if (approval) {
            const approvalResult = orchestrator.submitApproval(company_id, approval.id, {
              status: 'approved',
              feedback: 'Deliverable validated and accepted automatically via MCP.',
              reviewer_role: 'System Operator'
            });
            newlyUnblocked = approvalResult.unblockedTaskIds;
          }
        }

        const nextReady = orchestrator.getNextReadyTask(company_id);

        return successResponse({
          accepted: true,
          task_id,
          task_title: task.title,
          status: orchestrator.getTask(company_id, task_id)?.status,
          artifact_id: result.artifact.id,
          artifact_title: result.artifact.title,
          newly_unblocked_tasks: newlyUnblocked,
          next_ready_task: nextReady ? {
            id: nextReady.id,
            title: nextReady.title,
            department: nextReady.department,
            assigned_agent_id: nextReady.assigned_agent_id
          } : null
        });
      } catch (err: any) {
        return errorResponse(err.message, err.stack);
      }
    }
  );

  // 8. request_approval (NO execute/approve/reject tool exposed)
  server.tool(
    'request_approval',
    'Request human founder/manager approval for a consequential action. Returns cryptographic checksum and expiry. Approvals must be resolved by a human in the dashboard or CLI.',
    {
      company_id: z.string().describe('Company workspace ID'),
      task_id: z.string().describe('Task ID prompting this action'),
      action_type: z.enum([
        'send_outbound_emails',
        'publish_newsletter',
        'allocate_budget',
        'delete_data',
        'signoff_positioning',
        'deploy_telemetry'
      ] as const).describe('Type of consequential action'),
      payload: z.record(z.string(), z.any()).describe('The exact action payload to be executed upon human approval'),
      reason: z.string().describe('Business justification for the action'),
      expected_outcome: z.string().describe('Measurable expected outcome'),
      affected_resources: z.object({
        recipients: z.array(z.string()).optional(),
        channels: z.array(z.string()).optional(),
        records: z.array(z.string()).optional(),
        resources: z.array(z.string()).optional()
      }).optional().default({}),
      reviewer_role: z.string().optional().default('Founder / CEO'),
      risks: z.array(z.string()).optional().default([]),
      reversibility: z.enum(['reversible', 'partially_reversible', 'irreversible']).optional().default('reversible')
    },
    async (args) => {
      try {
        const task = orchestrator.getTask(args.company_id, args.task_id);
        const requestingAgentId = task?.assigned_agent_id || 'system_agent';

        const approval = approvalEngine.createRequest({
          company_id: args.company_id,
          task_id: args.task_id,
          action_type: args.action_type as ConsequentialActionType,
          payload: args.payload,
          reason: args.reason,
          expected_outcome: args.expected_outcome,
          affected_resources: args.affected_resources || {},
          requesting_agent_id: requestingAgentId,
          reviewer_role: args.reviewer_role,
          risks: args.risks || [],
          reversibility: args.reversibility || 'reversible'
        });

        return successResponse({
          approval_id: approval.id,
          status: approval.status,
          payload_checksum: approval.payload_checksum,
          reviewer_role: approval.reviewer_role,
          expires_at: approval.expires_at,
          notice: 'Approval request recorded with SHA-256 integrity checksum. This action cannot execute until explicitly approved by a human in the dashboard or CLI.'
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 9. get_approval_status
  server.tool(
    'get_approval_status',
    'Check the status and audit history of a consequential approval request.',
    {
      approval_id: z.string().describe('Approval request ID')
    },
    { readOnlyHint: true },
    async ({ approval_id }) => {
      try {
        const approval = approvalEngine.getApproval(approval_id);
        if (!approval) return errorResponse(`Approval ${approval_id} not found.`);

        return successResponse({
          id: approval.id,
          action_type: approval.action_type,
          status: approval.status,
          reviewer_role: approval.reviewer_role,
          payload_checksum: approval.payload_checksum,
          execution_status: approval.execution_status,
          expires_at: approval.expires_at,
          feedback: approval.feedback,
          audit_history: approval.audit_history
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 10. list_pending_approvals
  server.tool(
    'list_pending_approvals',
    'List all pending approvals for a company workspace, grouped by task with payload summaries and expiry.',
    {
      company_id: z.string().describe('Company workspace ID')
    },
    { readOnlyHint: true },
    async ({ company_id }) => {
      try {
        const pending = approvalEngine.listPendingApprovals(company_id);
        const tasks = orchestrator.listTasks(company_id);

        const digest = pending.map(a => {
          const t = tasks.find(x => x.id === a.task_id);
          return {
            approval_id: a.id,
            task_id: a.task_id,
            task_title: t?.title || 'Unknown Task',
            action_type: a.action_type,
            reason: a.reason,
            expected_outcome: a.expected_outcome,
            reviewer_role: a.reviewer_role,
            payload_checksum: a.payload_checksum,
            expires_at: a.expires_at,
            payload_summary: Object.keys(a.payload)
          };
        });

        return successResponse({
          pending_count: digest.length,
          approvals: digest
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 11. record_evidence
  server.tool(
    'record_evidence',
    'Record an evidence entry in the shared evidence ledger with strict provenance tagging.',
    {
      company_id: z.string().describe('Company workspace ID'),
      statement: z.string().describe('Observed or sourced claim statement'),
      source: z.string().describe('Verifiable source citation, URL, or customer interview reference'),
      evidence_type: z.enum(['observed_fact', 'sourced_claim', 'hypothesis', 'recommendation']).describe('Evidence provenance classification'),
      confidence: z.enum(['low', 'medium', 'high']).describe('Confidence rating'),
      author_agent_id: z.string().describe('Agent ID authoring this evidence'),
      tags: z.array(z.string()).optional().default([]),
      conflicting_with_id: z.string().optional().describe('ID of opposing evidence entry if known')
    },
    async (args) => {
      try {
        const record = sharedMemory.addEvidence(args.company_id, {
          statement: args.statement,
          source: args.source,
          evidence_type: args.evidence_type,
          confidence: args.confidence,
          author_agent_id: args.author_agent_id,
          tags: args.tags || [],
          conflicting_with_id: args.conflicting_with_id
        });

        return successResponse({
          recorded: true,
          evidence_id: record.id,
          evidence_type: record.evidence_type,
          confidence: record.confidence
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 12. flag_evidence_conflict
  server.tool(
    'flag_evidence_conflict',
    'Flag two evidence records as mutually contradictory for human manager review.',
    {
      company_id: z.string().describe('Company workspace ID'),
      evidence_id_a: z.string().describe('First evidence ID'),
      evidence_id_b: z.string().describe('Second conflicting evidence ID')
    },
    async ({ company_id, evidence_id_a, evidence_id_b }) => {
      try {
        sharedMemory.flagEvidenceConflict(company_id, evidence_id_a, evidence_id_b);
        return successResponse({
          flagged: true,
          evidence_id_a,
          evidence_id_b,
          message: 'Evidence conflict registered and flagged for human manager resolution in the Context tab.'
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 13. add_assumption
  server.tool(
    'add_assumption',
    'Record a new strategic assumption in the company context ledger.',
    {
      company_id: z.string().describe('Company workspace ID'),
      statement: z.string().min(5).describe('Assumption statement'),
      confidence: z.enum(['low', 'medium', 'high']).describe('Initial confidence level'),
      category: z.enum(['market', 'product', 'customer', 'growth']).describe('Category'),
      status: z.enum(['untested', 'validated', 'invalidated']).optional().default('untested')
    },
    async (args) => {
      try {
        const company = orchestrator.getCompany(args.company_id);
        if (!company) return errorResponse(`Company ${args.company_id} not found.`);

        const currentAssumptions = company.context.assumptions || [];
        const newAssumption = {
          id: `asm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          statement: args.statement,
          confidence: args.confidence,
          status: args.status || 'untested',
          category: args.category
        };

        orchestrator.updateCompanyContext(args.company_id, {
          assumptions: [...currentAssumptions, newAssumption]
        });

        return successResponse({
          recorded: true,
          assumption: newAssumption
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 14. record_decision
  server.tool(
    'record_decision',
    'Record a strategic founder or manager decision in the immutable decision log.',
    {
      company_id: z.string().describe('Company workspace ID'),
      title: z.string().min(3).describe('Decision headline'),
      context: z.string().min(10).describe('Background and situation context'),
      rationale: z.string().min(10).describe('Rationale and alternatives considered'),
      status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']).optional().default('accepted'),
      decided_by: z.string().optional().default('Founder / CEO')
    },
    async (args) => {
      try {
        const decision = orchestrator.createDecision(args.company_id, {
          title: args.title,
          context: args.context,
          rationale: args.rationale,
          status: args.status,
          decided_by: args.decided_by
        });

        return successResponse({
          recorded: true,
          decision
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 15. generate_operational_review
  server.tool(
    'generate_operational_review',
    'Generate comprehensive operational review and Theory of Constraints bottleneck analysis.',
    {
      company_id: z.string().describe('Company workspace ID')
    },
    async ({ company_id }) => {
      try {
        const report = reviewService.generateReview(company_id);
        return successResponse({
          company_id,
          generated_at: report.generated_at,
          bottleneck: report.bottleneck_analysis,
          single_priority: report.strategic_recommendation,
          experiment: report.proposed_experiment,
          metrics: report.metrics,
          markdown_report: report.markdown_report
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 16. create_backup
  server.tool(
    'create_backup',
    'Create an offline timestamped SQLite backup verified by PRAGMA integrity_check.',
    {},
    async () => {
      try {
        const meta = backupService.createBackup();
        return successResponse({
          created: true,
          backup_file: meta.backup_file,
          size_bytes: meta.size_bytes,
          created_at: meta.created_at,
          tables_verified: meta.tables
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );

  // 17. create_task
  server.tool(
    'create_task',
    'Create a custom task in the company workspace. Powers "Ask ORCHSTR to spin up tasks".',
    {
      company_id: z.string().describe('Company workspace ID'),
      title: z.string().min(3).describe('Task title'),
      department: z.string().describe('Department (strategy, research, growth, sales, product, support, finance, operations, design, website)'),
      agent_id: z.string().describe('Agent ID assigned to this task'),
      label: z.enum(['user_task', 'agent_task', 'needs_approval']).optional().default('agent_task'),
      stage: z.enum(['start', 'build', 'sell', 'scale']).optional().default('start'),
      description: z.string().optional().describe('Task description'),
      depends_on: z.array(z.string()).optional().default([]).describe('List of task IDs this task depends on'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
      acceptance_criteria: z.array(z.string()).optional().default(['Deliverable matches schema']),
      founder_move: z.string().optional(),
      watch_out: z.string().optional(),
      checklist: z.array(z.string()).optional().default([])
    },
    async (args) => {
      try {
        const task = orchestrator.createTask(args.company_id, {
          title: args.title,
          description: args.description || args.title,
          assigned_agent_id: args.agent_id,
          department: args.department,
          stage: args.stage || 'start',
          label: args.label || 'agent_task',
          priority: args.priority || 'medium',
          dependencies: args.depends_on || [],
          acceptance_criteria: args.acceptance_criteria && args.acceptance_criteria.length > 0
            ? args.acceptance_criteria
            : ['Deliverable matches schema'],
          founder_move: args.founder_move || '',
          watch_out: args.watch_out || '',
          checklist: args.checklist || []
        });

        return successResponse({
          created: true,
          task: {
            id: task.id,
            title: task.title,
            department: task.department,
            stage: task.stage,
            label: task.label,
            status: task.status,
            assigned_agent_id: task.assigned_agent_id,
            dependencies: task.dependencies
          }
        });
      } catch (err: any) {
        return errorResponse(err.message);
      }
    }
  );
}
