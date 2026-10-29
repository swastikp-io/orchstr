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

  public getNextReadyTask(companyId: string, agentId?: string): Task | null {
    const tasks = this.listTasks(companyId);
    // user_task tasks are never auto-assigned to an agent packet
    const readyTasks = tasks.filter(t => t.status === 'queued' && t.label !== 'user_task');
    if (agentId) {
      const match = readyTasks.find(t => t.assigned_agent_id === agentId);
      if (match) return match;
    }
    const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    readyTasks.sort((a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0));
    return readyTasks[0] || null;
  }

  public generatePlan(companyId: string, template: string = 'founder-guide'): { tasks: Task[]; template: string } {
    const existing = this.listTasks(companyId);
    if (existing.length > 0) {
      return { tasks: existing, template };
    }

    const createdTasks: Task[] = [];

    if (template === 'canonical-7') {
      const t1 = this.createTask(companyId, {
        title: 'Customer Discovery & Pain Point Taxonomy',
        description: 'Extract customer pain points, quotes, and willingness-to-pay evidence.',
        assigned_agent_id: 'agent_customer_research',
        department: 'research',
        stage: 'start',
        label: 'agent_task',
        priority: 'high',
        founder_move: 'Conduct at least 5 structured customer discovery conversations.',
        watch_out: 'Never ask leading questions that validate your own biases.',
        checklist: ['Extract verbatim customer quotes', 'Classify market evidence by provenance', 'Uncover existing manual workarounds'],
        acceptance_criteria: ['Customer quotes', 'Evidence classification', 'Willingness to pay'],
        parallelizable: true
      });
      createdTasks.push(t1);

      const t2 = this.createTask(companyId, {
        title: 'Category Brand Positioning & Wedge Strategy',
        description: 'Define category narrative, wedge market, and competitive moats.',
        assigned_agent_id: 'agent_brand_positioning',
        department: 'strategy',
        stage: 'start',
        label: 'agent_task',
        priority: 'critical',
        founder_move: 'Narrow your beachhead market until you are the only obvious choice.',
        watch_out: 'Broad positioning leads to diffuse messaging that converts nobody.',
        checklist: ['Formulate clear customer problem', 'Identify defensible wedge market', 'Contrast at least two competitive alternatives'],
        acceptance_criteria: ['Standard positioning statement', 'Competitor contrast matrix'],
        dependencies: [t1.id]
      });
      createdTasks.push(t2);

      const t3 = this.createTask(companyId, {
        title: 'Brand Identity Guidebook & Verbal Principles',
        description: 'Establish verbal voice rules, dos/donts, and dark theme design tokens.',
        assigned_agent_id: 'agent_brand_identity',
        department: 'design',
        stage: 'sell',
        label: 'agent_task',
        priority: 'medium',
        founder_move: 'Codify a stark obsidian design aesthetic and concise brand voice.',
        watch_out: 'Do not create complicated brand guides that nobody references in practice.',
        checklist: ['Define brand story narrative', 'Set obsidian dark theme color tokens', 'Establish verbal voice rules with dos and donts'],
        acceptance_criteria: ['Voice pillars', 'Color tokens', 'Creative briefs'],
        dependencies: [t2.id]
      });
      createdTasks.push(t3);

      const t4 = this.createTask(companyId, {
        title: 'Ideal Customer Profile & Verified Target Accounts',
        description: 'Map buyer personas and qualify target accounts without fabricating contacts.',
        assigned_agent_id: 'agent_prospect_discovery',
        department: 'growth',
        stage: 'sell',
        label: 'agent_task',
        priority: 'high',
        founder_move: 'Build a list of verified target accounts exhibiting urgent buying signals.',
        watch_out: 'Zero fake leads: every account and person must link to a real source URL.',
        checklist: ['Define account firmographic criteria', 'Source verified URLs for every company', 'Document explicit buying trigger events'],
        acceptance_criteria: ['Verified company records', 'Buying signals'],
        dependencies: [t2.id],
        parallelizable: true
      });
      createdTasks.push(t4);

      const t5 = this.createTask(companyId, {
        title: 'High-Converting Cold Outreach Campaign',
        description: 'Author 3-step outbound sequence using approved positioning and verified prospect evidence.',
        assigned_agent_id: 'agent_email_outreach',
        department: 'growth',
        stage: 'sell',
        label: 'needs_approval',
        priority: 'high',
        founder_move: 'Personalize each sequence step with the verified prospect evidence.',
        watch_out: 'Consequential action: sending emails requires founder approval before execution.',
        checklist: ['Author 3-touch sequence with clear value hooks', 'Prepare objection-handling templates', 'Ensure safe simulation mode before execution'],
        acceptance_criteria: ['3-step cadence', 'Follow-up objection handling'],
        dependencies: [t4.id, t3.id]
      });
      createdTasks.push(t5);

      const t6 = this.createTask(companyId, {
        title: 'Founding Launch Newsletter & Content Calendar',
        description: 'Draft the inaugural thought-leadership newsletter and 4-week editorial calendar.',
        assigned_agent_id: 'agent_marketing_newsletter',
        department: 'growth',
        stage: 'sell',
        label: 'agent_task',
        priority: 'medium',
        founder_move: 'Author a high-conviction founding narrative discussing the industry shift.',
        watch_out: 'Avoid bland corporate marketing tone; have a strong point of view.',
        checklist: ['Draft launch newsletter edition', 'Formulate 4-week content calendar', 'Document distribution channel hypotheses'],
        acceptance_criteria: ['Newsletter draft', 'Content calendar'],
        dependencies: [t2.id],
        parallelizable: true
      });
      createdTasks.push(t6);

      const t7 = this.createTask(companyId, {
        title: 'Product Analytics & Telemetry Blueprint',
        description: 'Design event taxonomy, activation definitions, and measurable experiment proposals.',
        assigned_agent_id: 'agent_product_analytics',
        department: 'product',
        stage: 'scale',
        label: 'agent_task',
        priority: 'high',
        founder_move: 'Establish an unambiguous mathematical activation milestone.',
        watch_out: 'Never invent telemetry numbers or track sensitive credentials.',
        checklist: ['Map user lifecycle event names', 'Define activation milestone criteria', 'Propose initial high-impact experiment'],
        acceptance_criteria: ['Event taxonomy', 'Activation formula', 'Proposed experiment'],
        dependencies: [t1.id],
        parallelizable: true
      });
      createdTasks.push(t7);

      return { tasks: createdTasks, template };
    }

    // Default: 'founder-guide' template (Stages: Start, Build, Sell, Scale)
    // 1. Stage: Start
    const s1 = this.createTask(companyId, {
      title: 'Problem Definition & Core Insight Formulation',
      description: 'Condense the primary customer pain point into a single testable sentence.',
      assigned_agent_id: 'agent_customer_research',
      department: 'research',
      stage: 'start',
      label: 'agent_task',
      priority: 'critical',
      founder_move: 'Synthesize verbatim customer language into a single testable problem statement.',
      watch_out: 'Do not jump into feature solutions before proving the problem is acute.',
      checklist: [
        'Document customer language and verbatim quotes',
        'Map existing manual user workarounds',
        'Isolate the single most expensive point of friction'
      ],
      acceptance_criteria: ['Problem defined in customer language', 'Documented workarounds', 'Verifiable pain signals'],
      parallelizable: true
    });
    createdTasks.push(s1);

    const s2 = this.createTask(companyId, {
      title: 'Idea Evaluation & Unfair Insight Audit',
      description: 'Evaluate the venture idea across market urgency, founder insight, and wedge potential.',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'strategy',
      stage: 'start',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Clarify what unique secret or insight gives our approach an unfair advantage.',
      watch_out: 'Entering a crowded space with an undifferentiated feature set is fatal.',
      checklist: [
        'Assess market urgency and willingness to pay',
        'Identify unique architectural or workflow insight',
        'Evaluate defensibility against incumbents'
      ],
      acceptance_criteria: ['Defensible unique insight', 'Documented wedge market hypothesis'],
      dependencies: [s1.id]
    });
    createdTasks.push(s2);

    const s3 = this.createTask(companyId, {
      title: 'Wedge Market Segmentation & ICP Definition',
      description: 'Carve out an underserved, reachable segment where the product is 10x better.',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'strategy',
      stage: 'start',
      label: 'agent_task',
      priority: 'critical',
      founder_move: 'Narrow target segment until competitors are completely ignoring their specific needs.',
      watch_out: 'Do not target everyone in an industry; focus on a specific job role.',
      checklist: [
        'Define explicit boundaries for too-broad vs wedge segment',
        'Identify primary reachable champion persona',
        'Formulate canonical positioning statement'
      ],
      acceptance_criteria: ['Wedge market boundary', 'Ideal customer profile', 'Positioning statement'],
      dependencies: [s2.id]
    });
    createdTasks.push(s3);

    const s4 = this.createTask(companyId, {
      title: 'Naming & Identity Direction Verification',
      description: 'Select brand name candidates, verify domain availability, and set tone guidelines.',
      assigned_agent_id: 'agent_brand_identity',
      department: 'design',
      stage: 'start',
      label: 'user_task',
      priority: 'low',
      founder_move: 'Choose a concise, memorable name and verify domain/trademark availability.',
      watch_out: 'Do not spend weeks debating names; clarity always beats cleverness.',
      checklist: [
        'Brainstorm 5 naming candidates',
        'Verify .com or primary TLD availability',
        'Check basic trademark registers'
      ],
      acceptance_criteria: ['Brand name selected', 'Domain direction verified'],
      dependencies: [s3.id]
    });
    createdTasks.push(s4);

    const s5 = this.createTask(companyId, {
      title: 'First Seven Days Execution Plan',
      description: 'Set immediate operational priorities and measurable validation gates for week one.',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'operations',
      stage: 'start',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Lock in 3 tangible customer milestones to achieve in the first 7 days.',
      watch_out: 'Mistaking administrative setup for customer validation is the classic trap.',
      checklist: [
        'Set 3 primary goals for week 1',
        'Define single leading indicator metric',
        'Assign owners and daily cadence'
      ],
      acceptance_criteria: ['Weekly milestone backlog', 'Measurable goal'],
      dependencies: [s3.id]
    });
    createdTasks.push(s5);

    // 2. Stage: Build
    const b1 = this.createTask(companyId, {
      title: 'MVP Specification & Core Scope Boundary',
      description: 'Define the 3 to 5 vital capabilities that solve the wedge customer problem.',
      assigned_agent_id: 'agent_website_build',
      department: 'product',
      stage: 'build',
      label: 'agent_task',
      priority: 'critical',
      founder_move: 'Scope exactly 3 to 5 core features and reject all extraneous requests.',
      watch_out: 'Building non-essential settings and secondary features delays launch.',
      checklist: [
        'Define core user problem',
        'Specify 3 to 5 must-have capabilities',
        'Document explicit out-of-scope backlog'
      ],
      acceptance_criteria: ['MVP feature list between 3 and 5 items', 'Boundary definition'],
      dependencies: [s3.id]
    });
    createdTasks.push(b1);

    const b2 = this.createTask(companyId, {
      title: 'Repository, Deployment & Secrets Setup',
      description: 'Configure source control repository, automated deployment, and secret isolation.',
      assigned_agent_id: 'agent_website_build',
      department: 'website',
      stage: 'build',
      label: 'user_task',
      priority: 'medium',
      founder_move: 'Establish an automated CI/CD pipeline with strict environment secret separation.',
      watch_out: 'Never commit credentials, tokens, or environment keys into git history.',
      checklist: [
        'Create isolated git repository',
        'Configure deployment pipeline and SSL',
        'Ensure .env secrets are gitignored'
      ],
      acceptance_criteria: ['Repo initialized', 'Deployment pipeline active', 'Secrets verified'],
      dependencies: [b1.id]
    });
    createdTasks.push(b2);

    const b3 = this.createTask(companyId, {
      title: 'Backend Architecture & Multi-Tenant Data Isolation',
      description: 'Establish SQLite database schema, secure authentication boundaries, and tenant isolation.',
      assigned_agent_id: 'agent_product_analytics',
      department: 'product',
      stage: 'build',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Enforce multi-tenant company_id scoping across every single database query.',
      watch_out: 'Leaking data between workspaces violates foundational security hygiene.',
      checklist: [
        'Design relational database schema',
        'Enforce company_id foreign key constraints',
        'Implement tamper-resistant approval checks'
      ],
      acceptance_criteria: ['Relational schema defined', 'Multi-tenant isolation verified'],
      dependencies: [b1.id]
    });
    createdTasks.push(b3);

    const b4 = this.createTask(companyId, {
      title: 'Frontend Core User Flows & Design Tokens',
      description: 'Build obsidian-themed primary user interface and onboarding progression.',
      assigned_agent_id: 'agent_brand_identity',
      department: 'design',
      stage: 'build',
      label: 'agent_task',
      priority: 'medium',
      founder_move: 'Design an intuitive user journey from landing through the primary aha moment.',
      watch_out: 'Avoid cluttered interfaces; keep cognitive load minimal.',
      checklist: [
        'Construct obsidian zinc dark UI theme',
        'Build main navigation and empty states',
        'Ensure responsive layout and error handling'
      ],
      acceptance_criteria: ['Responsive UI components', 'Design tokens configured'],
      dependencies: [b1.id]
    });
    createdTasks.push(b4);

    const b5 = this.createTask(companyId, {
      title: 'Testing & Production Quality Gate Audit',
      description: 'Execute unit and integration test suites, verifying zero fatal defects before traffic.',
      assigned_agent_id: 'agent_product_analytics',
      department: 'operations',
      stage: 'build',
      label: 'needs_approval',
      priority: 'high',
      founder_move: 'Run automated end-to-end tests and obtain human review approval before launch.',
      watch_out: 'Releasing broken primary flows destroys user confidence permanently.',
      checklist: [
        'Run full unit test suite with 100% pass rate',
        'Verify zero console errors in production build',
        'Obtain founder sign-off on production readiness'
      ],
      acceptance_criteria: ['Test suites passing', 'Founder production sign-off'],
      dependencies: [b3.id, b4.id]
    });
    createdTasks.push(b5);

    // 3. Stage: Sell
    const se1 = this.createTask(companyId, {
      title: 'Brand Story, Voice & Visual Direction',
      description: 'Document cohesive brand narrative, verbal voice principles, and asset guidelines.',
      assigned_agent_id: 'agent_brand_identity',
      department: 'strategy',
      stage: 'sell',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Craft a compelling narrative explaining why the old way is broken.',
      watch_out: 'Generic marketing copy makes the company invisible to discerning buyers.',
      checklist: [
        'Document 5-part brand narrative story',
        'Define tone attributes and dos and donts',
        'Specify creative asset guidelines'
      ],
      acceptance_criteria: ['Approved brand story', 'Voice guidelines defined'],
      dependencies: [s3.id]
    });
    createdTasks.push(se1);

    const se2 = this.createTask(companyId, {
      title: 'Conversion-Focused Product Website Spec',
      description: 'Author homepage copy answering who it is for, problem, product, and clear call-to-action.',
      assigned_agent_id: 'agent_website_build',
      department: 'website',
      stage: 'sell',
      label: 'agent_task',
      priority: 'critical',
      founder_move: 'Answer the 5 core customer questions immediately above the website fold.',
      watch_out: 'Vague buzzwords fail to convert technical buyers looking for concrete value.',
      checklist: [
        'Answer Who, Problem, Product, Why Better, Next Step',
        'Include clear primary call-to-action',
        'Verify mobile responsiveness and fast loading'
      ],
      acceptance_criteria: ['Homepage copy authored', 'Value proposition clearly displayed'],
      dependencies: [se1.id]
    });
    createdTasks.push(se2);

    const se3 = this.createTask(companyId, {
      title: 'Target Account Sourcing & Signal Verification',
      description: 'Identify verified buyer accounts matching ICP without fabricating any contact data.',
      assigned_agent_id: 'agent_prospect_discovery',
      department: 'growth',
      stage: 'sell',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Source verified company accounts demonstrating real urgency and active buying signals.',
      watch_out: 'Zero fake leads: every account and person must link to a real source URL.',
      checklist: [
        'Map target accounts to ICP criteria',
        'Source verifiable company websites and signals',
        'Filter out accounts with low relevance or bad timing'
      ],
      acceptance_criteria: ['Verified prospect records', 'Source URLs documented'],
      dependencies: [se1.id],
      parallelizable: true
    });
    createdTasks.push(se3);

    const se4 = this.createTask(companyId, {
      title: 'Personalized 7-Day Outbound Outreach Campaign',
      description: 'Author multi-touch cold email sequence using approved positioning and verified prospect signals.',
      assigned_agent_id: 'agent_email_outreach',
      department: 'growth',
      stage: 'sell',
      label: 'needs_approval',
      priority: 'high',
      founder_move: 'Craft a 7-day multi-channel cadence with specific, relevant customer hooks.',
      watch_out: 'Consequential action: sending emails requires founder approval and safe simulation mode.',
      checklist: [
        'Draft 3-step sequence with soft walkaway',
        'Verify SPF, DKIM, and DMARC inbox warmup',
        'Submit for human founder authorization'
      ],
      acceptance_criteria: ['Personalized sequences drafted', 'Human review approval required'],
      dependencies: [se3.id, se1.id]
    });
    createdTasks.push(se4);

    const se5 = this.createTask(companyId, {
      title: 'Thought Leadership Launch Newsletter & Calendar',
      description: 'Draft the founding newsletter edition and establish a 4-week editorial calendar.',
      assigned_agent_id: 'agent_marketing_newsletter',
      department: 'growth',
      stage: 'sell',
      label: 'agent_task',
      priority: 'medium',
      founder_move: 'Write an authoritative newsletter framing the shift in market dynamics.',
      watch_out: 'Consistency matters: commit only to content cadences your team can sustain.',
      checklist: [
        'Author inaugural newsletter edition',
        'Map 4-week editorial topic calendar',
        'Formulate distribution channel hypotheses'
      ],
      acceptance_criteria: ['Newsletter draft complete', 'Content calendar established'],
      dependencies: [se1.id],
      parallelizable: true
    });
    createdTasks.push(se5);

    // 4. Stage: Scale
    const sc1 = this.createTask(companyId, {
      title: 'Telemetry Event Taxonomy & Funnel Diagnostics',
      description: 'Establish snake_case event taxonomy and measure user activation milestones.',
      assigned_agent_id: 'agent_product_analytics',
      department: 'product',
      stage: 'scale',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Track user journey events from sign-up through core value realization.',
      watch_out: 'Never track sensitive data, passwords, or payment credentials.',
      checklist: [
        'Map 8 standard user lifecycle events',
        'Define mathematical activation milestone',
        'Establish baseline retention cohort tracking'
      ],
      acceptance_criteria: ['Event taxonomy specified', 'Activation formula documented'],
      dependencies: [b1.id],
      parallelizable: true
    });
    createdTasks.push(sc1);

    const sc2 = this.createTask(companyId, {
      title: 'Deterministic Unit Economics & Payback Assessment',
      description: 'Calculate logo churn, ARPU, LTV, CAC, and payback periods from verified metrics.',
      assigned_agent_id: 'agent_unit_economics',
      department: 'finance',
      stage: 'scale',
      label: 'agent_task',
      priority: 'high',
      founder_move: 'Run deterministic financial formulas to establish true customer acquisition efficiency.',
      watch_out: 'Never substitute optimistic guesses for missing revenue or acquisition data.',
      checklist: [
        'Calculate logo and revenue churn',
        'Compute ARPU, LTV, and Gross-Margin LTV',
        'Determine CAC and payback period in months'
      ],
      acceptance_criteria: ['Deterministic calculations complete', 'Zero invented figures'],
      dependencies: [sc1.id]
    });
    createdTasks.push(sc2);

    const sc3 = this.createTask(companyId, {
      title: 'Customer Support Decision Trees & Human Escalation',
      description: 'Create triage guides, troubleshooting trees, and human escalation policies.',
      assigned_agent_id: 'agent_customer_support',
      department: 'support',
      stage: 'scale',
      label: 'agent_task',
      priority: 'medium',
      founder_move: 'Build fast resolution decision trees for common friction and define human safety gates.',
      watch_out: 'Unresolved support tickets directly drive early customer churn.',
      checklist: [
        'Build decision trees for login, billing, and errors',
        'Specify human escalation rules for refund and security issues',
        'Establish feedback mechanism into product backlog'
      ],
      acceptance_criteria: ['Decision trees documented', 'Human escalation rules established'],
      dependencies: [sc1.id]
    });
    createdTasks.push(sc3);

    const sc4 = this.createTask(companyId, {
      title: 'Bi-Weekly Operational Bottleneck Review Loop',
      description: 'Analyze system constraints using Theory of Constraints and propose 2-week experiment.',
      assigned_agent_id: 'agent_product_analytics',
      department: 'operations',
      stage: 'scale',
      label: 'needs_approval',
      priority: 'high',
      founder_move: 'Identify the single biggest operating constraint and run one focused experiment.',
      watch_out: 'Trying to optimize multiple bottlenecks simultaneously creates execution paralysis.',
      checklist: [
        'Evaluate 6-phase operating loop performance',
        'Identify single primary constraint bottleneck',
        'Formulate measurable 2-week experiment with owner'
      ],
      acceptance_criteria: ['Operational review generated', 'Single priority experiment defined'],
      dependencies: [sc1.id, sc2.id]
    });
    createdTasks.push(sc4);

    return { tasks: createdTasks, template };
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
    stage?: string;
    label?: string;
    founder_move?: string;
    watch_out?: string;
    checklist?: string[];
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
    const stage = data.stage || 'start';
    const label = data.label || 'agent_task';
    const founderMove = data.founder_move || '';
    const watchOut = data.watch_out || '';
    const checklist = data.checklist || [];

    const agent = SPECIALIZED_AGENTS.find(a => a.id === data.assigned_agent_id);
    if (!agent) throw new Error(`Agent ${data.assigned_agent_id} does not exist.`);

    const companyData = this.getCompany(companyId);
    if (!companyData) throw new Error(`Company ${companyId} does not exist.`);

    this.db.prepare(`
      INSERT INTO tasks (id, company_id, title, description, assigned_agent_id, department, stage, label, founder_move, watch_out, checklist, status, priority, inputs, outputs, acceptance_criteria, parallelizable, retry_count, max_retries, missing_inputs, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, NULL, ?, ?, 0, 3, '[]', ?, ?)
    `).run(
      taskId, companyId, data.title, data.description, data.assigned_agent_id,
      data.department, stage, label, founderMove, watchOut, JSON.stringify(checklist),
      priority, JSON.stringify(inputs), JSON.stringify(data.acceptance_criteria),
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
        stage: r.stage || 'start',
        label: r.label || 'agent_task',
        founder_move: r.founder_move || '',
        watch_out: r.watch_out || '',
        checklist: r.checklist ? (typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist) : [],
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

    const maxRetries = task.max_retries ?? 3;
    if (task.retry_count >= maxRetries) {
      throw new Error(`Task ${taskId} has exceeded max retries (${maxRetries}).`);
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
      `Retried task "${task.title}" (Attempt ${newRetryCount} of ${task.max_retries ?? 3}) [Status: ${nextStatus}]`,
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
