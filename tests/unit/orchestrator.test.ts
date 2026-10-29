import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { initializeDatabase } from '../../server/db/schema.js';
import { OrchestrationEngine } from '../../server/domain/orchestrator.js';

describe('OrchestrationEngine Integration & State Machine', () => {
  const testDbFile = 'test_orchstr.db';
  let db: DatabaseSync;
  let orchestrator: OrchestrationEngine;

  beforeEach(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    db = new DatabaseSync(testDbFile);
    initializeDatabase(db);
    orchestrator = new OrchestrationEngine(db);
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    } catch {}
  });

  it('enforces dependency ordering and blocks dependent tasks until prerequisites are completed', () => {
    const { company } = orchestrator.createCompany({
      name: 'AlphaCorp',
      industry: 'SaaS',
      vision: 'Building autonomous company software.',
      brief: 'AlphaCorp builds enterprise orchestration.',
      target_customer: 'CTOs',
      value_prop: 'Save 20 hours a week.'
    });

    // Create Task 1 (Research)
    const task1 = orchestrator.createTask(company.id, {
      title: 'Customer Discovery',
      description: 'Run customer discovery interviews',
      assigned_agent_id: 'agent_customer_research',
      department: 'Research',
      priority: 'high',
      acceptance_criteria: ['Discover 3 pain points']
    });
    expect(task1.status).toBe('queued');

    // Create Task 2 (Positioning, depends on Task 1)
    const task2 = orchestrator.createTask(company.id, {
      title: 'Brand Positioning',
      description: 'Define category positioning',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'Strategy',
      priority: 'high',
      acceptance_criteria: ['Define positioning statement'],
      dependencies: [task1.id]
    });
    // Task 2 must be BLOCKED because Task 1 is only 'queued'
    expect(task2.status).toBe('blocked');

    // Executing Task 2 while blocked must throw an error
    expect(() => {
      orchestrator.executeTask(company.id, task2.id, { mode: 'mock' });
    }).toThrow(/Prerequisites are not yet satisfied/);

    // Execute Task 1 (moves to review with pending approval request)
    orchestrator.executeTask(company.id, task1.id, { mode: 'mock' });
    const approvals = orchestrator.listApprovals(company.id);
    expect(approvals.length).toBe(1);
    expect(approvals[0].task_id).toBe(task1.id);

    // Task 2 is still blocked because Task 1 is in review (not yet approved)
    const task2StillBlocked = orchestrator.getTask(company.id, task2.id);
    expect(task2StillBlocked?.status).toBe('blocked');

    // Manager reviews and approves Task 1
    const approvalResult = orchestrator.submitApproval(company.id, approvals[0].id, {
      status: 'approved',
      feedback: 'Approved by Research Manager'
    });

    expect(approvalResult.task.status).toBe('completed');
    expect(approvalResult.unblockedTaskIds).toContain(task2.id);

    // Task 2 must now be UNBLOCKED and in QUEUED status
    const task2Unblocked = orchestrator.getTask(company.id, task2.id);
    expect(task2Unblocked?.status).toBe('queued');
  });

  it('guarantees retry safety without duplicating completed artifacts', () => {
    const { company } = orchestrator.createCompany({
      name: 'RetryTest Co',
      industry: 'Robotics',
      vision: 'Autonomous systems',
      brief: 'Building robotic perception.',
      target_customer: 'Engineers',
      value_prop: 'Zero-latency perception'
    });

    const task = orchestrator.createTask(company.id, {
      title: 'Customer Research Sprint',
      description: 'Analyze user friction',
      assigned_agent_id: 'agent_customer_research',
      department: 'Research',
      priority: 'high',
      acceptance_criteria: ['Check pain points']
    });

    // Execute task to produce artifact
    orchestrator.executeTask(company.id, task.id, {
      mode: 'manual',
      artifactTitle: 'Customer Findings v1',
      artifactContent: '# Findings v1'
    });

    const artifactsBefore = orchestrator.listArtifacts(company.id);
    expect(artifactsBefore.length).toBe(1);
    expect(artifactsBefore[0].version).toBe(1);

    // Manager requests changes / rejects
    const approvals = orchestrator.listApprovals(company.id);
    orchestrator.submitApproval(company.id, approvals[0].id, {
      status: 'changes_requested',
      feedback: 'Please expand on Tier-2 supplier latency'
    });

    // Task is now queued for retry
    const retriedTask = orchestrator.retryTask(company.id, task.id);
    expect(retriedTask.retry_count).toBe(1);
    expect(retriedTask.status).toBe('queued');

    // Existing artifact is PRESERVED, not duplicated or destroyed
    const artifactsAfterRetry = orchestrator.listArtifacts(company.id);
    expect(artifactsAfterRetry.length).toBe(1);

    // Execute again with revised deliverable
    orchestrator.executeTask(company.id, task.id, {
      mode: 'manual',
      artifactTitle: 'Customer Findings v2 (Expanded)',
      artifactContent: '# Findings v2 with Tier-2 latency analysis'
    });

    // Artifact was updated in-place with incremented version, strictly avoiding duplicates
    const artifactsFinal = orchestrator.listArtifacts(company.id);
    expect(artifactsFinal.length).toBe(1);
    expect(artifactsFinal[0].version).toBe(2);
    expect(artifactsFinal[0].title).toBe('Customer Findings v2 (Expanded)');
  });

  it('strictly enforces cross-company workspace isolation', () => {
    const compA = orchestrator.createCompany({
      name: 'Company Alpha',
      industry: 'FinTech',
      vision: 'Fintech vision',
      brief: 'Brief Alpha',
      target_customer: 'Bankers',
      value_prop: 'Value Alpha'
    });

    const compB = orchestrator.createCompany({
      name: 'Company Beta',
      industry: 'BioTech',
      vision: 'Biotech vision',
      brief: 'Brief Beta',
      target_customer: 'Doctors',
      value_prop: 'Value Beta'
    });

    // Create tasks in Company Alpha
    const taskA = orchestrator.createTask(compA.company.id, {
      title: 'Alpha Secret Strategy',
      description: 'Confidential Fintech Strategy',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'Strategy',
      acceptance_criteria: ['Secret']
    });

    // Create tasks in Company Beta
    const taskB = orchestrator.createTask(compB.company.id, {
      title: 'Beta Clinical Protocol',
      description: 'Oncology Protocol',
      assigned_agent_id: 'agent_customer_research',
      department: 'Research',
      acceptance_criteria: ['HIPAA compliant']
    });

    // Query Company Alpha: must only see Alpha's tasks and context
    const alphaTasks = orchestrator.listTasks(compA.company.id);
    expect(alphaTasks.length).toBe(1);
    expect(alphaTasks[0].id).toBe(taskA.id);
    expect(alphaTasks.some(t => t.id === taskB.id)).toBe(false);

    // Query Company Beta: must only see Beta's tasks
    const betaTasks = orchestrator.listTasks(compB.company.id);
    expect(betaTasks.length).toBe(1);
    expect(betaTasks[0].id).toBe(taskB.id);
    expect(betaTasks.some(t => t.id === taskA.id)).toBe(false);

    // Cross-company task access attempt must return null
    const leakedTask = orchestrator.getTask(compA.company.id, taskB.id);
    expect(leakedTask).toBeNull();
  });

  it('generates complete, actionable Antigravity Task Packets matching all required fields', () => {
    const { company } = orchestrator.createCompany({
      name: 'PacketCorp',
      industry: 'DevTools',
      vision: 'Next-gen dev tools',
      brief: 'PacketCorp builds developer CLI tools.',
      target_customer: 'Senior Engineers',
      value_prop: 'Instant code orchestration',
      assumptions: [
        { statement: 'Developers prefer CLI prompt packets', confidence: 'high', status: 'validated', category: 'product' }
      ],
      constraints: ['No external model API keys allowed']
    });

    const task = orchestrator.createTask(company.id, {
      title: 'Formulate Positioning Wedge',
      description: 'Define our competitive wedge against legacy terminals',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'Strategy',
      priority: 'high',
      acceptance_criteria: [
        'Positioning calculus formula',
        'Competitor contrast matrix'
      ]
    });

    const { packet, promptMarkdown } = orchestrator.getTaskPacket(company.id, task.id);

    // Verify all required packet fields
    expect(packet.taskId).toBe(task.id);
    expect(packet.assignedAgent).toBeDefined();
    expect(packet.assignedAgent.id).toBe('agent_brand_positioning');
    expect(packet.companyContextReferences).toBeDefined();
    expect(packet.companyContextReferences.brief).toBe('PacketCorp builds developer CLI tools.');
    expect(packet.companyContextReferences.active_assumptions.length).toBe(1);
    expect(packet.dependencies).toBeDefined();
    expect(packet.instructions).toBeDefined();
    expect(packet.instructions.stepByStep.length).toBeGreaterThan(0);
    expect(packet.outputDestination).toBeDefined();
    expect(packet.outputDestination.storageTarget).toContain(task.id);
    expect(packet.acceptanceCriteria).toBeDefined();
    expect(packet.acceptanceCriteria.length).toBe(2);
    expect(packet.requiredApprovalLevel).toBe('Strategy Manager');

    // Verify formatted prompt contains clear markdown directives
    expect(promptMarkdown).toContain('[ORCHSTR AGENT TASK PACKET]');
    expect(promptMarkdown).toContain('Brand Positioning Strategist');
    expect(promptMarkdown).toContain('PacketCorp builds developer CLI tools.');
    expect(promptMarkdown).toContain('ACCEPTANCE CRITERIA');
  });
});
