import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from './connection.js';
import { OrchestrationEngine } from '../orchestration/orchestrator.js';
import { SharedMemoryManager } from '../memory/shared-memory.js';
import { ApprovalEngine } from '../server/approvals/approval-engine.js';
import { SafeLogger } from '../server/services/logger.js';

export function runSeed(dbPath?: string) {
  const db = getDatabase(dbPath);
  const orchestrator = new OrchestrationEngine(db);
  const memoryManager = new SharedMemoryManager(db);
  const approvalEngine = new ApprovalEngine(db);

  SafeLogger.info('Starting canonical database seed...');

  // Clean slate
  db.exec(`
    DELETE FROM consequential_approvals;
    DELETE FROM customer_records;
    DELETE FROM competitor_records;
    DELETE FROM experiment_backlog;
    DELETE FROM evidence_ledger;
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

  // 1. Primary Company Workspace: ApexFlow Systems
  const apex = orchestrator.createCompany({
    name: 'ApexFlow Systems',
    industry: 'Enterprise Hardware & Supply Chain Tech',
    vision: 'To eliminate multi-tier manufacturing supply chain stoppages through continuous graph intelligence and autonomous mitigation playbooks.',
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

  const apexId = apex.company.id;

  // Add Initial Decisions
  orchestrator.createDecision(apexId, {
    title: 'Standardize on Human-in-the-Loop Approval Architecture',
    context: 'Customer discovery revealed enterprise hesitation regarding unconstrained AI actions.',
    rationale: 'Mandatory managerial review removes the primary enterprise procurement blocker and ensures audit compliance.',
    status: 'accepted',
    decided_by: 'Founder / CEO'
  });

  orchestrator.createDecision(apexId, {
    title: 'Focus Initial Wedge Exclusively on Electronic Component Disruptions',
    context: 'Surveyed commodity groups including resin, sheet metal, and semiconductors.',
    rationale: 'Passives and microcontrollers account for 74% of unexpected production shutdowns.',
    status: 'accepted',
    decided_by: 'Strategy Manager'
  });

  // Seed Shared Memory: Evidence, Competitors, Customers, Experiments
  memoryManager.addEvidence(apexId, {
    statement: '15 of 18 interviewed manufacturing VPs reported margin losses exceeding $2.4M due to sub-tier supplier visibility blindspots.',
    source: 'Q3 2026 Customer Discovery Interviews (18 Transcripts)',
    evidence_type: 'observed_fact',
    confidence: 'high',
    tags: ['pain_point', 'sub_tier_visibility', 'revenue_impact'],
    author_agent_id: 'agent_customer_research'
  });

  memoryManager.addEvidence(apexId, {
    statement: 'Procurement directors express high reluctance to permit software to generate purchase orders without human signoff.',
    source: 'Procurement Director Interview Panel (n=10)',
    evidence_type: 'observed_fact',
    confidence: 'high',
    tags: ['governance', 'human_in_loop', 'sales_blocker'],
    author_agent_id: 'agent_customer_research'
  });

  memoryManager.addEvidence(apexId, {
    statement: 'Competitor freight tracking software focuses only on transit delays rather than multi-tier BOM dependency graphs.',
    source: 'Gartner Supply Chain Visibility Magic Quadrant 2026',
    evidence_type: 'sourced_claim',
    confidence: 'high',
    tags: ['competition', 'differentiation'],
    author_agent_id: 'agent_brand_positioning'
  });

  // Add Verified Customer Prospects (No fabricated contacts)
  memoryManager.addCustomerRecord(apexId, {
    company_name: 'AccuDynamics Industrial Solutions',
    contact_name: 'Marcus Vance',
    contact_title: 'VP of Global Supply Chain',
    source_url: 'https://linkedin.com/in/marcus-vance-supplychain',
    buying_signal: 'Announced 90-day Ohio facility expansion amidst semiconductor lead-time delays',
    qualification_rationale: '$140M revenue, 1,200 employees, complex multi-tier electro-mechanical BOM',
    confidence: 'high',
    is_excluded: false
  });

  memoryManager.addCustomerRecord(apexId, {
    company_name: 'Vanguard Precision Robotics',
    contact_name: 'Elena Rostova',
    contact_title: 'Director of Strategic Sourcing',
    source_url: 'https://linkedin.com/in/elena-rostova-sourcing',
    buying_signal: 'Posted 3 job openings for supplier risk mitigation specialists',
    qualification_rationale: '$220M revenue, heavy dependence on rare-earth electric motors',
    confidence: 'high',
    is_excluded: false
  });

  // Add Proposed Experiment
  memoryManager.addExperiment(apexId, {
    title: 'Tier-2 Shortage Cold Email Observational Hook Test',
    hypothesis: 'Personalized cold emails referencing specific Tier-2 passive component shortages will generate >7% demo request rate.',
    intervention: 'A/B test observational pain-hook copy against generic ERP optimization copy across 50 verified VP targets.',
    primary_metric: 'Positive Demo Booking Rate',
    owner: 'Growth Manager',
    duration_weeks: 2,
    status: 'proposed'
  });

  // Seed 7-Agent Task Graph
  // Task 1: Customer Research (Completed)
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

  orchestrator.executeTask(apexId, taskResearch.id, { mode: 'mock' });
  const approvals1 = orchestrator.listApprovals(apexId);
  if (approvals1.length > 0) {
    orchestrator.submitApproval(apexId, approvals1[0].id, {
      status: 'approved',
      feedback: 'Approved by Research Manager. Findings are well-grounded.',
      reviewer_role: 'Research Manager'
    });
  }

  // Task 2: Brand Positioning (Review state)
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

  orchestrator.executeTask(apexId, taskPositioning.id, { mode: 'mock' });

  // Task 3: Brand Identity (Blocked by Positioning)
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

  // Task 4: Prospect Discovery (Blocked by Positioning)
  orchestrator.createTask(apexId, {
    id: `task_${apexId}_prospects`,
    title: 'Map Ideal Customer Profile (ICP) & Target Account Roster',
    description: 'Define firmographic filters, buyer personas, and qualify 5 representative mid-market manufacturing target accounts without fabricating contacts.',
    assigned_agent_id: 'agent_prospect_discovery',
    department: 'Growth',
    priority: 'high',
    inputs: {},
    acceptance_criteria: [
      'Define 2 buyer personas with titles and KPIs',
      'Provide quantifiable qualification filters (revenue, BOM SKUs)',
      'List verified sample target companies with source URLs'
    ],
    parallelizable: true,
    dependencies: [taskPositioning.id]
  });

  // Task 5: Cold Outreach (Blocked by Prospects & Identity)
  const taskOutreach = orchestrator.createTask(apexId, {
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

  // Task 6: Newsletter (Blocked by Positioning)
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

  // Task 7: Product Analytics (Queued / Parallelizable)
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

  // Seed a pending Consequential Approval Request (Outbound Email Campaign Dispatch)
  approvalEngine.createRequest({
    company_id: apexId,
    task_id: taskOutreach.id,
    action_type: 'send_outbound_emails',
    payload: {
      campaign_name: 'Sub-Tier Blindspot Initial Pilot Sprint',
      target_persona: 'VP of Global Supply Chain',
      recipients: [
        { email: 'mvance@accudynamics.com', name: 'Marcus Vance', company: 'AccuDynamics Industrial' },
        { email: 'erostova@vanguardrobotics.com', name: 'Elena Rostova', company: 'Vanguard Precision Robotics' }
      ],
      sequence: [
        { step: 1, subject: "{{companyName}}'s Tier-2 supplier exposure?", body: 'Hi {{firstName}}, most hardware leaders have zero visibility into Tier-2 components...' }
      ]
    },
    reason: 'Initiate targeted outbound prospecting to validate demand for sub-tier BOM observability.',
    expected_outcome: 'Schedule 3-5 exploratory discovery calls with verified manufacturing operations directors.',
    affected_resources: {
      recipients: ['mvance@accudynamics.com', 'erostova@vanguardrobotics.com'],
      channels: ['cold_email_relay'],
      records: ['AccuDynamics', 'Vanguard Precision']
    },
    requesting_agent_id: 'agent_email_outreach',
    reviewer_role: 'Founder / CEO',
    risks: [
      'Recipient brand perception risk if email is considered unsolicited',
      'Domain reputation impact if recipient flags email as spam'
    ],
    reversibility: 'irreversible'
  });

  // 2. Secondary Company: BioPulse Health (for Cross-Company Isolation Verification)
  const bio = orchestrator.createCompany({
    name: 'BioPulse Health',
    industry: 'Digital Health & Clinical Trials',
    vision: 'To eliminate clinical trial attrition through predictive continuous biometric monitoring and decentralized patient adherence analytics.',
    brief: 'BioPulse Health provides a continuous biometric telemetry and adherence platform for Phase II/III clinical trials. Trial sponsors lose up to $4M per study due to unmonitored patient dropouts and non-compliance.',
    target_customer: 'VP of Clinical Operations and Principal Investigators at mid-sized biopharma and CRO sponsors.',
    value_prop: 'Real-time adherence telemetry that cuts clinical trial dropouts by 40%.'
  });

  orchestrator.createTask(bio.company.id, {
    id: `task_${bio.company.id}_research`,
    title: 'Clinical Trial Patient Drop-out Root Cause Analysis',
    description: 'Synthesize protocol deviations across 12 decentralized clinical trial oncology sites.',
    assigned_agent_id: 'agent_customer_research',
    department: 'Research',
    priority: 'high',
    acceptance_criteria: ['Identify top 3 patient dropout triggers'],
    parallelizable: true
  });

  // Write file workspaces in companies/<slug>/
  const apexDir = path.join(process.cwd(), 'companies', 'apexflow-systems');
  const bioDir = path.join(process.cwd(), 'companies', 'biopulse-health');
  fs.mkdirSync(path.join(apexDir, 'artifacts'), { recursive: true });
  fs.mkdirSync(path.join(apexDir, 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(bioDir, 'artifacts'), { recursive: true });
  fs.mkdirSync(path.join(bioDir, 'tasks'), { recursive: true });

  fs.writeFileSync(path.join(apexDir, 'company.json'), JSON.stringify(apex, null, 2));
  fs.writeFileSync(path.join(bioDir, 'company.json'), JSON.stringify(bio, null, 2));

  SafeLogger.info('Canonical database seed finished successfully.');
  return { apexFlowId: apexId, bioPulseId: bio.company.id };
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
