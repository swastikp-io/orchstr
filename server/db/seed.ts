import { getDatabase } from './connection.js';
import { OrchestrationEngine } from '../domain/orchestrator.js';

export function runSeed(dbPath?: string) {
  const db = getDatabase(dbPath);
  const orchestrator = new OrchestrationEngine(db);

  // Clear existing records if re-seeding
  db.exec(`
    DELETE FROM approval_requests;
    DELETE FROM agent_runs;
    DELETE FROM activity_events;
    DELETE FROM artifacts;
    DELETE FROM task_dependencies;
    DELETE FROM tasks;
    DELETE FROM decisions;
    DELETE FROM company_context;
    DELETE FROM companies;
  `);

  console.log('Seeding ORCHSTR database...');

  // 1. PRIMARY WORKSPACE: ApexFlow
  const apexFlow = orchestrator.createCompany({
    name: 'ApexFlow Systems',
    industry: 'Enterprise Hardware & Supply Chain Tech',
    vision: 'To make global industrial manufacturing resilient against catastrophic multi-tier supplier disruptions through continuous graph intelligence and autonomous mitigation playbooks.',
    brief: 'ApexFlow is an Autonomous Supply Chain Resilience Operating System. Mid-market manufacturers managing $50M–$500M BOM spend suffer catastrophic line stoppages because Tier-2/3 raw material bottlenecks remain invisible until shipments are weeks overdue. ApexFlow connects directly to legacy ERPs (SAP, NetSuite) in 48 hours, continuously maps sub-tier supplier dependencies, and generates pre-vetted recovery playbooks with human-in-the-loop executive control.',
    target_customer: 'VPs of Supply Chain, Heads of Procurement, and Chief Operating Officers at mid-market precision manufacturing, industrial electronics, and medical device companies.',
    value_prop: 'Continuous sub-tier BOM risk observability and deterministic mitigation playbooks that prevent expensive production line shutdowns without requiring multi-year ERP migrations.',
    assumptions: [
      {
        statement: 'Mid-market manufacturing VPs will pay $50k+/year if we detect sub-tier shortages 14 days earlier.',
        confidence: 'high',
        status: 'validated',
        category: 'market'
      },
      {
        statement: 'Procurement directors will reject fully automated order dispatching without explicit human manager signoff.',
        confidence: 'high',
        status: 'validated',
        category: 'product'
      },
      {
        statement: 'Legacy ERP API connectors (SAP RFC, NetSuite RESTlet) can be deployed within 48 hours without engineering support.',
        confidence: 'medium',
        status: 'untested',
        category: 'product'
      },
      {
        statement: 'Cold outbound email referencing specific sub-tier supplier bottlenecks will generate >8% demo booking rate.',
        confidence: 'medium',
        status: 'untested',
        category: 'growth'
      },
      {
        statement: 'Competitors like Project44 and SAP Ariba will be unable to replicate deep multi-tier graph simulations due to legacy schema lock-in.',
        confidence: 'low',
        status: 'untested',
        category: 'market'
      }
    ],
    constraints: [
      'Must maintain SOC2 Type II compliance standards for customer ERP telemetry.',
      'All autonomous mitigation playbooks must require explicit human approval before external transmission.',
      'Initial release targets North American and European industrial manufacturing corridors.'
    ]
  });

  const apexId = apexFlow.company.id;

  // Add Initial Decisions for ApexFlow
  orchestrator.createDecision(apexId, {
    title: 'Adopt Human-in-the-Loop Approval Architecture',
    context: 'Customer discovery revealed severe enterprise hesitation regarding autonomous procurement transactions.',
    rationale: 'Requiring designated manager approval guarantees operational compliance and removes the primary enterprise sales blocker.',
    status: 'accepted',
    decided_by: 'Founder / CEO'
  });

  orchestrator.createDecision(apexId, {
    title: 'Focus MVP Exclusively on Tier-2/3 Electronic Component Bottlenecks',
    context: 'Initial scope considered raw chemical commodities, plastic injection molds, and semiconductors simultaneously.',
    rationale: 'Electronic semiconductors and passives represent 74% of sudden production shutdowns in our target demographic.',
    status: 'accepted',
    decided_by: 'Strategy Manager'
  });

  // Seed Multi-Stage Task Dependency Graph for ApexFlow
  // Stage 1: Customer Research (Completed)
  const taskResearch = orchestrator.createTask(apexId, {
    id: `task_${apexId}_research`,
    title: 'Synthesize Qualitative Customer Discovery & Pain Point Taxonomy',
    description: 'Analyze transcripts from 18 interviews with manufacturing VPs to identify high-severity friction points and budget authority thresholds.',
    assigned_agent_id: 'agent_customer_research',
    department: 'Research',
    priority: 'high',
    inputs: {
      interview_notes_or_market_context: 'Transcripts from 18 mid-market hardware operations directors conducted in Q3 2026.'
    },
    acceptance_criteria: [
      'Document at least 3 distinct validated pain point clusters with quotes',
      'Evaluate willingness to pay and budget triggers',
      'Surface any contradictory evidence or buyer hesitations'
    ],
    parallelizable: true
  });

  // Execute and approve Customer Research to produce baseline completed state
  orchestrator.executeTask(apexId, taskResearch.id, { mode: 'mock' });
  const approvals1 = orchestrator.listApprovals(apexId);
  if (approvals1.length > 0) {
    orchestrator.submitApproval(apexId, approvals1[0].id, {
      status: 'approved',
      feedback: 'Excellent synthesis. The human-in-the-loop finding is critical for our positioning.',
      reviewer_role: 'Research Manager'
    });
  }

  // Stage 2: Brand Positioning (Currently in REVIEW state with pending Approval Request)
  const taskPositioning = orchestrator.createTask(apexId, {
    id: `task_${apexId}_positioning`,
    title: 'Formulate Category Brand Positioning & Competitor Wedge',
    description: 'Develop the canonical positioning statement, category naming, and competitor contrast matrix against legacy ERPs and freight trackers.',
    assigned_agent_id: 'agent_brand_positioning',
    department: 'Strategy',
    priority: 'critical',
    inputs: {},
    acceptance_criteria: [
      'Formulate standard positioning statement (For/Who/ApexFlow/That/Unlike/Because)',
      'Construct a 3-way competitor contrast table against SAP Ariba and Project44',
      'Align directly with validated Tier-2/3 visibility pain points'
    ],
    parallelizable: false,
    dependencies: [taskResearch.id]
  });

  // Execute Brand Positioning into 'review' status with pending approval request
  orchestrator.executeTask(apexId, taskPositioning.id, { mode: 'mock' });

  // Stage 3: Brand Identity (Currently BLOCKED by Brand Positioning)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_identity`,
    title: 'Establish Brand Identity Guidebook & Verbal Principles',
    description: 'Define voice pillars, dos & donts, dark theme design tokens, and UI aesthetic guidelines for technical operations leaders.',
    assigned_agent_id: 'agent_brand_identity',
    department: 'Strategy',
    priority: 'medium',
    inputs: {},
    acceptance_criteria: [
      'Articulate 3 voice pillars with concrete dos and donts',
      'Define semantic dark theme color palette and typography rules',
      'Produce an actionable design and voice guide'
    ],
    parallelizable: false,
    dependencies: [taskPositioning.id]
  });

  // Stage 4: Prospect Discovery (Currently BLOCKED by Brand Positioning)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_prospects`,
    title: 'Map Ideal Customer Profile (ICP) & Target Account Roster',
    description: 'Define firmographic filters, buyer personas, and qualify 5 representative mid-market manufacturing target accounts.',
    assigned_agent_id: 'agent_prospect_discovery',
    department: 'Growth',
    priority: 'high',
    inputs: {},
    acceptance_criteria: [
      'Define 2 buyer personas with titles and KPIs',
      'Provide quantifiable qualification filters (revenue, BOM SKUs)',
      'List 5 verified sample target companies'
    ],
    parallelizable: true,
    dependencies: [taskPositioning.id]
  });

  // Stage 5: Email Outreach (Currently BLOCKED by Prospect Discovery & Brand Identity)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_outreach`,
    title: 'Author High-Converting 3-Step Cold Outreach Cadence',
    description: 'Craft an outbound cold email sequence for VP Supply Chain personas focusing on the Tier-2 blindspot.',
    assigned_agent_id: 'agent_email_outreach',
    department: 'Growth',
    priority: 'high',
    inputs: {},
    acceptance_criteria: [
      'Complete 3-step sequence with distinct delay timings',
      'All email bodies under 125 words adhering to brand voice',
      'Include 3 alternative subject lines for split testing'
    ],
    parallelizable: false,
    dependencies: [`task_${apexId}_prospects`, `task_${apexId}_identity`]
  });

  // Stage 6: Marketing Launch Newsletter (Currently BLOCKED by Brand Positioning)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_newsletter`,
    title: 'Author Founding Launch Newsletter ("The Fragility Tax")',
    description: 'Compose the inaugural thought-leadership newsletter unpacking the macro supply chain shift from JIT to resilient graph models.',
    assigned_agent_id: 'agent_marketing_newsletter',
    department: 'Growth',
    priority: 'medium',
    inputs: {},
    acceptance_criteria: [
      'Connects narrative to macroeconomic supply chain shifts',
      'Delivers tactical framework for operations leaders',
      'Includes private beta waitlist call to action'
    ],
    parallelizable: true,
    dependencies: [taskPositioning.id]
  });

  // Stage 7: Product Analytics Telemetry Blueprint (QUEUED / Ready because Customer Research is completed!)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_analytics`,
    title: 'Architect Product Analytics & Telemetry Blueprint',
    description: 'Define North Star metric (Prevented Production Downtime Hours), activation milestones, and tracking event specifications.',
    assigned_agent_id: 'agent_product_analytics',
    department: 'Product',
    priority: 'high',
    inputs: {
      core_workflow_steps: ['Connect ERP', 'Upload BOM', 'Map Tier-2 Graph', 'Review Risk Matrix', 'Approve Mitigation Playbook']
    },
    acceptance_criteria: [
      'Define North Star metric and 3 supporting input metrics',
      'Detail 5 standard tracking events with explicit schemas',
      'Specify user activation milestone'
    ],
    parallelizable: true,
    dependencies: [taskResearch.id]
  });

  // Recalculate to ensure accurate queued / blocked flags
  orchestrator.recalculateTaskStatuses(apexId);

  // 2. SECONDARY WORKSPACE: BioPulse Health (for Cross-Company Workspace Switching & Isolation)
  const bioPulse = orchestrator.createCompany({
    name: 'BioPulse Health',
    industry: 'Digital Health & Clinical Trials',
    vision: 'To eliminate clinical trial attrition through predictive continuous biometric monitoring and decentralized patient adherence analytics.',
    brief: 'BioPulse Health provides a continuous biometric telemetry and adherence platform for Phase II/III clinical trials. Trial sponsors lose up to $4M per study due to unmonitored patient dropouts and non-compliance.',
    target_customer: 'VP of Clinical Operations and Principal Investigators at mid-sized biopharma and CRO sponsors.',
    value_prop: 'Real-time adherence telemetry that cuts clinical trial dropouts by 40%.',
    assumptions: [
      {
        statement: 'CROs will mandate patient wearable telemetry if FDA protocol compliance is pre-certified.',
        confidence: 'high',
        status: 'untested',
        category: 'product'
      }
    ],
    constraints: ['Strict HIPAA and GDPR regulatory compliance.']
  });

  const bioId = bioPulse.company.id;

  orchestrator.createTask(bioId, {
    id: `task_${bioId}_research`,
    title: 'Clinical Trial Patient Drop-out Root Cause Analysis',
    description: 'Synthesize protocol deviations across 12 decentralized clinical trial oncology sites.',
    assigned_agent_id: 'agent_customer_research',
    department: 'Research',
    priority: 'high',
    inputs: {
      interview_notes_or_market_context: 'Oncology Phase II trial dropout telemetry'
    },
    acceptance_criteria: [
      'Identify top 3 patient dropout triggers',
      'Assess willingness to pay by CRO site coordinators'
    ],
    parallelizable: true
  });

  console.log(`Seeding complete!`);
  console.log(`Workspace 1: ApexFlow Systems (${apexId})`);
  console.log(`Workspace 2: BioPulse Health (${bioId})`);
  return { apexFlowId: apexId, bioPulseId: bioId };
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
