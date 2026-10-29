import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { initializeDatabase } from '../../src/db/schema.js';
import { SharedMemoryManager } from '../../src/memory/shared-memory.js';
import { OrchestrationEngine } from '../../src/orchestration/orchestrator.js';

describe('Shared Memory & Managerial Review Gates', () => {
  const testDbFile = 'test_memory.db';
  let db: DatabaseSync;
  let memoryManager: SharedMemoryManager;
  let orchestrator: OrchestrationEngine;
  let companyId: string;

  beforeEach(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    db = new DatabaseSync(testDbFile);
    initializeDatabase(db);
    memoryManager = new SharedMemoryManager(db);
    orchestrator = new OrchestrationEngine(db);

    const comp = orchestrator.createCompany({
      name: 'Memory Test Corp',
      industry: 'B2B Software',
      vision: 'Shared memory verification',
      brief: 'Brief for memory gates',
      target_customer: 'Engineers',
      value_prop: 'Reliable shared facts'
    });
    companyId = comp.company.id;
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    } catch {}
  });

  it('enforces gate: outreach and marketing cannot consume unapproved positioning', () => {
    // Brand positioning is not yet approved
    const gateCheckOutreach = memoryManager.validateGateForAgent(companyId, 'agent_email_outreach');
    expect(gateCheckOutreach.isPermitted).toBe(false);
    expect(gateCheckOutreach.reason).toContain('requires an approved Brand Positioning deliverable');

    const gateCheckMarketing = memoryManager.validateGateForAgent(companyId, 'agent_marketing_newsletter');
    expect(gateCheckMarketing.isPermitted).toBe(false);

    // Now execute and approve Brand Positioning
    const posTask = orchestrator.createTask(companyId, {
      title: 'Brand Positioning Matrix',
      description: 'Define category positioning',
      assigned_agent_id: 'agent_brand_positioning',
      department: 'Strategy',
      acceptance_criteria: ['Positioning formula']
    });

    orchestrator.executeTask(companyId, posTask.id, { mode: 'mock' });
    const approvals = orchestrator.listApprovals(companyId);
    orchestrator.submitApproval(companyId, approvals[0].id, {
      status: 'approved',
      feedback: 'Approved by Strategy Manager'
    });

    // Marketing gate is now cleared
    const gateMarketingAfter = memoryManager.validateGateForAgent(companyId, 'agent_marketing_newsletter');
    expect(gateMarketingAfter.isPermitted).toBe(true);

    // Outreach still requires verified customer prospects
    const gateOutreachMissingProspects = memoryManager.validateGateForAgent(companyId, 'agent_email_outreach');
    expect(gateOutreachMissingProspects.isPermitted).toBe(false);
    expect(gateOutreachMissingProspects.reason).toContain('requires at least one verified non-excluded prospect record');

    // Add verified prospect
    memoryManager.addCustomerRecord(companyId, {
      company_name: 'Verified Enterprise',
      contact_name: 'John Doe',
      contact_title: 'VP Operations',
      source_url: 'https://linkedin.com/in/johndoe',
      buying_signal: 'ERP migration',
      qualification_rationale: 'Fits ICP',
      confidence: 'high',
      is_excluded: false
    });

    // Outreach gate is now cleared
    const gateOutreachCleared = memoryManager.validateGateForAgent(companyId, 'agent_email_outreach');
    expect(gateOutreachCleared.isPermitted).toBe(true);
  });

  it('surfaces conflicting evidence pairs for human manager resolution', () => {
    // Add primary claim
    const ev1 = memoryManager.addEvidence(companyId, {
      statement: 'Enterprises want fully autonomous dispatching without human review.',
      source: 'Operator Survey A',
      evidence_type: 'hypothesis',
      confidence: 'low',
      author_agent_id: 'agent_customer_research'
    });

    // Add opposing contradictory claim referencing ev1
    memoryManager.addEvidence(companyId, {
      statement: 'Procurement directors explicitly forbid automated order execution without human signoff.',
      source: 'Procurement Panel B',
      evidence_type: 'observed_fact',
      confidence: 'high',
      author_agent_id: 'agent_customer_research',
      conflicting_with_id: ev1.id
    });

    const conflicts = memoryManager.findConflictingEvidence(companyId);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].evidenceA.statement).toContain('Procurement directors explicitly forbid');
    expect(conflicts[0].evidenceB.statement).toContain('Enterprises want fully autonomous dispatching');
  });
});
