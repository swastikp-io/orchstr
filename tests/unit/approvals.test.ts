import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { initializeDatabase } from '../../src/db/schema.js';
import { ApprovalEngine } from '../../src/server/approvals/approval-engine.js';
import { SafeActionLayer } from '../../src/server/approvals/action-layer.js';
import { OrchestrationEngine } from '../../src/orchestration/orchestrator.js';

describe('Server-Enforced Approval Engine & Security Action Layer', () => {
  const testDbFile = 'test_approvals.db';
  let db: DatabaseSync;
  let approvalEngine: ApprovalEngine;
  let actionLayer: SafeActionLayer;
  let orchestrator: OrchestrationEngine;
  let companyId: string;
  let taskId: string;

  beforeEach(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    db = new DatabaseSync(testDbFile);
    initializeDatabase(db);
    approvalEngine = new ApprovalEngine(db);
    actionLayer = new SafeActionLayer(approvalEngine);
    orchestrator = new OrchestrationEngine(db);

    const comp = orchestrator.createCompany({
      name: 'Security Test Co',
      industry: 'Cybersecurity',
      vision: 'Enforcing server-side authorization',
      brief: 'Brief for security testing',
      target_customer: 'CISOs',
      value_prop: 'Bulletproof authorization'
    });
    companyId = comp.company.id;

    const task = orchestrator.createTask(companyId, {
      title: 'Dispatch Cold Outreach',
      description: 'Outbound campaign',
      assigned_agent_id: 'agent_email_outreach',
      department: 'Growth',
      acceptance_criteria: ['Check']
    });
    taskId = task.id;
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    } catch {}
  });

  it('proves that pending actions cannot execute', async () => {
    const payload = {
      campaign_name: 'Alpha Pilot',
      target_persona: 'CISO',
      recipients: [{ email: 'ciso@secure.com', name: 'Security Chief', company: 'Secure Corp' }],
      sequence: [{ step: 1, subject: 'Security Drift', body: 'Observing IAM drift...' }]
    };

    const req = approvalEngine.createRequest({
      company_id: companyId,
      task_id: taskId,
      action_type: 'send_outbound_emails',
      payload,
      reason: 'Validate outbound demand',
      expected_outcome: 'Book calls',
      affected_resources: { recipients: ['ciso@secure.com'] },
      requesting_agent_id: 'agent_email_outreach',
      risks: ['Reputation risk'],
      reversibility: 'irreversible'
    });

    // Attempting execution while status is 'pending' must be strictly rejected
    await expect(
      actionLayer.executeSendOutboundEmails(req.id, payload)
    ).rejects.toThrow(/Execution Blocked: Approval request is in 'pending' state/);
  });

  it('proves that rejected actions cannot execute', async () => {
    const payload = {
      campaign_name: 'Beta Campaign',
      target_persona: 'CISO',
      recipients: [{ email: 'target@corp.com', name: 'Target', company: 'Corp' }],
      sequence: [{ step: 1, subject: 'Pitch', body: 'Sales pitch...' }]
    };

    const req = approvalEngine.createRequest({
      company_id: companyId,
      task_id: taskId,
      action_type: 'send_outbound_emails',
      payload,
      reason: 'Outreach',
      expected_outcome: 'Sales',
      affected_resources: {},
      requesting_agent_id: 'agent_email_outreach',
      risks: [],
      reversibility: 'irreversible'
    });

    // Founder rejects request
    approvalEngine.reject(req.id, 'Founder / CEO', 'Copy is overly salesy.');

    // Execution must be strictly blocked
    await expect(
      actionLayer.executeSendOutboundEmails(req.id, payload)
    ).rejects.toThrow(/Execution Blocked: Approval request is in 'rejected' state/);
  });

  it('proves that modified payloads require fresh approval (tamper protection)', async () => {
    const originalPayload = {
      campaign_name: 'Approved Campaign',
      target_persona: 'CISO',
      recipients: [{ email: 'real@enterprise.com', name: 'Real', company: 'Enterprise' }],
      sequence: [{ step: 1, subject: 'Audit', body: 'Strict body' }]
    };

    const req = approvalEngine.createRequest({
      company_id: companyId,
      task_id: taskId,
      action_type: 'send_outbound_emails',
      payload: originalPayload,
      reason: 'Outreach',
      expected_outcome: 'Pilot',
      affected_resources: {},
      requesting_agent_id: 'agent_email_outreach',
      risks: [],
      reversibility: 'irreversible'
    });

    // Founder approves original payload
    approvalEngine.approve(req.id, 'Founder / CEO', 'Approved original copy.');

    // Attacker or modified agent attempts to execute with an altered payload!
    const tamperedPayload = {
      ...originalPayload,
      recipients: [
        { email: 'real@enterprise.com', name: 'Real', company: 'Enterprise' },
        { email: 'unauthorized_leak@competitor.com', name: 'Spy', company: 'Competitor' }
      ]
    };

    await expect(
      actionLayer.executeSendOutboundEmails(req.id, tamperedPayload)
    ).rejects.toThrow(/Execution Blocked: The payload has changed since approval was granted/);

    // Verify request status was reset to 'changes_requested'
    const updated = approvalEngine.getApproval(req.id);
    expect(updated?.status).toBe('changes_requested');
  });

  it('proves duplicate requests cannot cause duplicate side effects', async () => {
    const payload = {
      campaign_name: 'Single Send Only',
      target_persona: 'CISO',
      recipients: [{ email: 'lead@target.com', name: 'Lead', company: 'Target' }],
      sequence: [{ step: 1, subject: 'Once', body: 'Single send...' }]
    };

    const req = approvalEngine.createRequest({
      company_id: companyId,
      task_id: taskId,
      action_type: 'send_outbound_emails',
      payload,
      reason: 'Outreach',
      expected_outcome: 'Feedback',
      affected_resources: {},
      requesting_agent_id: 'agent_email_outreach',
      risks: [],
      reversibility: 'irreversible'
    });

    // Founder approves
    approvalEngine.approve(req.id, 'Founder / CEO');

    // First execution succeeds
    const res1 = await actionLayer.executeSendOutboundEmails(req.id, payload);
    expect(res1.simulated).toBe(true);

    // Second execution must be strictly rejected to prevent duplicate execution
    await expect(
      actionLayer.executeSendOutboundEmails(req.id, payload)
    ).rejects.toThrow(/Duplicate execution prevented/);
  });
});
