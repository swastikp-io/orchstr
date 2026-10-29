import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type ConsequentialActionType =
  | 'send_outbound_emails'
  | 'publish_newsletter'
  | 'allocate_budget'
  | 'delete_data'
  | 'signoff_positioning'
  | 'deploy_telemetry';

export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'expired';
export type Reversibility = 'reversible' | 'partially_reversible' | 'irreversible';
export type ExecutionStatus = 'not_executed' | 'executed' | 'failed';

export interface ConsequentialApproval {
  id: string;
  company_id: string;
  task_id: string;
  action_type: ConsequentialActionType;
  payload: Record<string, any>;
  payload_checksum: string;
  reason: string;
  expected_outcome: string;
  affected_resources: {
    recipients?: string[];
    channels?: string[];
    records?: string[];
    resources?: string[];
  };
  requesting_agent_id: string;
  reviewer_role: string;
  risks: string[];
  reversibility: Reversibility;
  status: ApprovalState;
  feedback?: string | null;
  expires_at: string;
  execution_status: ExecutionStatus;
  execution_result?: Record<string, any> | null;
  executed_at?: string | null;
  audit_history: Array<{
    timestamp: string;
    actor: string;
    action: string;
    note?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export function computePayloadChecksum(payload: Record<string, any>): string {
  // Sort keys deterministically
  const sortedJson = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(sortedJson).digest('hex');
}

export class ApprovalEngine {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.initTable();
  }

  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consequential_approvals (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        payload_checksum TEXT NOT NULL,
        reason TEXT NOT NULL,
        expected_outcome TEXT NOT NULL,
        affected_resources TEXT NOT NULL,
        requesting_agent_id TEXT NOT NULL,
        reviewer_role TEXT NOT NULL,
        risks TEXT NOT NULL,
        reversibility TEXT NOT NULL CHECK(reversibility IN ('reversible', 'partially_reversible', 'irreversible')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'changes_requested', 'expired')),
        feedback TEXT,
        expires_at TEXT NOT NULL,
        execution_status TEXT NOT NULL CHECK(execution_status IN ('not_executed', 'executed', 'failed')),
        execution_result TEXT,
        executed_at TEXT,
        audit_history TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conseq_comp ON consequential_approvals(company_id);
      CREATE INDEX IF NOT EXISTS idx_conseq_task ON consequential_approvals(task_id);
      CREATE INDEX IF NOT EXISTS idx_conseq_status ON consequential_approvals(status);
    `);
  }

  /**
   * Creates a formal approval request for consequential actions.
   */
  public createRequest(data: {
    company_id: string;
    task_id: string;
    action_type: ConsequentialActionType;
    payload: Record<string, any>;
    reason: string;
    expected_outcome: string;
    affected_resources: {
      recipients?: string[];
      channels?: string[];
      records?: string[];
      resources?: string[];
    };
    requesting_agent_id: string;
    reviewer_role?: string;
    risks: string[];
    reversibility: Reversibility;
    expires_in_days?: number;
  }): ConsequentialApproval {
    const id = `capp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const expiryDays = data.expires_in_days ?? 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const checksum = computePayloadChecksum(data.payload);
    const reviewerRole = data.reviewer_role || 'Founder / CEO';

    const auditHistory = [
      {
        timestamp: now,
        actor: data.requesting_agent_id,
        action: 'created',
        note: `Requested authorization for [${data.action_type}] from ${reviewerRole}.`
      }
    ];

    this.db.prepare(`
      INSERT INTO consequential_approvals (
        id, company_id, task_id, action_type, payload, payload_checksum, reason,
        expected_outcome, affected_resources, requesting_agent_id, reviewer_role,
        risks, reversibility, status, expires_at, execution_status, audit_history,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'not_executed', ?, ?, ?)
    `).run(
      id, data.company_id, data.task_id, data.action_type, JSON.stringify(data.payload),
      checksum, data.reason, data.expected_outcome, JSON.stringify(data.affected_resources),
      data.requesting_agent_id, reviewerRole, JSON.stringify(data.risks), data.reversibility,
      expiresAt, JSON.stringify(auditHistory), now, now
    );

    return this.getApproval(id)!;
  }

  public getApproval(id: string): ConsequentialApproval | null {
    const row = this.db.prepare(`SELECT * FROM consequential_approvals WHERE id = ?`).get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      company_id: row.company_id,
      task_id: row.task_id,
      action_type: row.action_type,
      payload: JSON.parse(row.payload),
      payload_checksum: row.payload_checksum,
      reason: row.reason,
      expected_outcome: row.expected_outcome,
      affected_resources: JSON.parse(row.affected_resources || '{}'),
      requesting_agent_id: row.requesting_agent_id,
      reviewer_role: row.reviewer_role,
      risks: JSON.parse(row.risks || '[]'),
      reversibility: row.reversibility,
      status: row.status,
      feedback: row.feedback,
      expires_at: row.expires_at,
      execution_status: row.execution_status,
      execution_result: row.execution_result ? JSON.parse(row.execution_result) : null,
      executed_at: row.executed_at,
      audit_history: JSON.parse(row.audit_history || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  public listApprovals(companyId: string): ConsequentialApproval[] {
    const rows = this.db.prepare(`
      SELECT * FROM consequential_approvals WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId) as any[];

    return rows.map(r => ({
      id: r.id,
      company_id: r.company_id,
      task_id: r.task_id,
      action_type: r.action_type,
      payload: JSON.parse(r.payload),
      payload_checksum: r.payload_checksum,
      reason: r.reason,
      expected_outcome: r.expected_outcome,
      affected_resources: JSON.parse(r.affected_resources || '{}'),
      requesting_agent_id: r.requesting_agent_id,
      reviewer_role: r.reviewer_role,
      risks: JSON.parse(r.risks || '[]'),
      reversibility: r.reversibility,
      status: r.status,
      feedback: r.feedback,
      expires_at: r.expires_at,
      execution_status: r.execution_status,
      execution_result: r.execution_result ? JSON.parse(r.execution_result) : null,
      executed_at: r.executed_at,
      audit_history: JSON.parse(r.audit_history || '[]'),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  public approve(id: string, reviewer: string, feedback?: string): ConsequentialApproval {
    const existing = this.getApproval(id);
    if (!existing) throw new Error(`Approval ${id} not found.`);
    if (existing.status !== 'pending') {
      throw new Error(`Cannot approve: Request status is already '${existing.status}'.`);
    }

    const now = new Date().toISOString();
    const updatedAudit = [
      ...existing.audit_history,
      { timestamp: now, actor: reviewer, action: 'approved', note: feedback }
    ];

    this.db.prepare(`
      UPDATE consequential_approvals
      SET status = 'approved', feedback = ?, audit_history = ?, updated_at = ?
      WHERE id = ?
    `).run(feedback || null, JSON.stringify(updatedAudit), now, id);

    return this.getApproval(id)!;
  }

  public reject(id: string, reviewer: string, feedback: string): ConsequentialApproval {
    const existing = this.getApproval(id);
    if (!existing) throw new Error(`Approval ${id} not found.`);
    if (existing.status !== 'pending') {
      throw new Error(`Cannot reject: Request status is already '${existing.status}'.`);
    }

    const now = new Date().toISOString();
    const updatedAudit = [
      ...existing.audit_history,
      { timestamp: now, actor: reviewer, action: 'rejected', note: feedback }
    ];

    this.db.prepare(`
      UPDATE consequential_approvals
      SET status = 'rejected', feedback = ?, audit_history = ?, updated_at = ?
      WHERE id = ?
    `).run(feedback, JSON.stringify(updatedAudit), now, id);

    return this.getApproval(id)!;
  }

  public requestRevision(id: string, reviewer: string, feedback: string): ConsequentialApproval {
    const existing = this.getApproval(id);
    if (!existing) throw new Error(`Approval ${id} not found.`);

    const now = new Date().toISOString();
    const updatedAudit = [
      ...existing.audit_history,
      { timestamp: now, actor: reviewer, action: 'changes_requested', note: feedback }
    ];

    this.db.prepare(`
      UPDATE consequential_approvals
      SET status = 'changes_requested', feedback = ?, audit_history = ?, updated_at = ?
      WHERE id = ?
    `).run(feedback, JSON.stringify(updatedAudit), now, id);

    return this.getApproval(id)!;
  }

  public expireStaleApprovals(companyId: string): number {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT id, audit_history FROM consequential_approvals
      WHERE company_id = ? AND status = 'pending' AND expires_at < ?
    `).all(companyId, now) as any[];

    for (const r of rows) {
      const history = JSON.parse(r.audit_history || '[]');
      history.push({ timestamp: now, actor: 'System Clock', action: 'expired', note: 'Approval expired due to inaction.' });

      this.db.prepare(`
        UPDATE consequential_approvals
        SET status = 'expired', audit_history = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(history), now, r.id);
    }

    return rows.length;
  }

  /**
   * SERVER-ENFORCED ACTION EXECUTION GATE
   * Evaluates all cryptographic and state gates before executing any consequential side effect.
   */
  public executeAction(
    id: string,
    submittedPayload: Record<string, any>,
    executor: (payload: Record<string, any>) => Promise<Record<string, any>>
  ): Promise<ConsequentialApproval> {
    const approval = this.getApproval(id);
    if (!approval) throw new Error(`Approval ${id} not found.`);

    // Gate 1: Status must be explicitly 'approved'
    if (approval.status !== 'approved') {
      throw new Error(`Execution Blocked: Approval request is in '${approval.status}' state. Only approved requests can be executed.`);
    }

    // Gate 2: Duplicate execution prevention
    if (approval.execution_status === 'executed') {
      throw new Error(`Execution Blocked: Duplicate execution prevented. This action was already executed at ${approval.executed_at}.`);
    }

    // Gate 3: Expiration check
    if (new Date() > new Date(approval.expires_at)) {
      this.db.prepare(`UPDATE consequential_approvals SET status = 'expired' WHERE id = ?`).run(id);
      throw new Error(`Execution Blocked: Approval expired on ${approval.expires_at}. Fresh approval required.`);
    }

    // Gate 4: Payload Integrity & Tamper Check (SHA-256)
    const submittedChecksum = computePayloadChecksum(submittedPayload);
    if (submittedChecksum !== approval.payload_checksum) {
      // Consequential payload changed! Invalidate approval and require fresh approval
      const now = new Date().toISOString();
      const updatedAudit = [
        ...approval.audit_history,
        {
          timestamp: now,
          actor: 'Security Action Layer',
          action: 'execution_rejected_tamper',
          note: 'Submitted payload does not match approved checksum. Fresh approval required.'
        }
      ];

      this.db.prepare(`
        UPDATE consequential_approvals
        SET status = 'changes_requested', feedback = 'Consequential payload was modified after approval was granted. Fresh approval is strictly required.', audit_history = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(updatedAudit), now, id);

      throw new Error(`Execution Blocked: The payload has changed since approval was granted. Fresh approval is required.`);
    }

    // All gates cleared: Proceed to execute safely
    return executor(submittedPayload)
      .then((result) => {
        const now = new Date().toISOString();
        const updatedAudit = [
          ...approval.audit_history,
          {
            timestamp: now,
            actor: 'Action Layer Executor',
            action: 'executed',
            note: 'Action completed successfully.'
          }
        ];

        this.db.prepare(`
          UPDATE consequential_approvals
          SET execution_status = 'executed', execution_result = ?, executed_at = ?, audit_history = ?, updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify(result), now, JSON.stringify(updatedAudit), now, id);

        return this.getApproval(id)!;
      })
      .catch((err) => {
        const now = new Date().toISOString();
        const updatedAudit = [
          ...approval.audit_history,
          {
            timestamp: now,
            actor: 'Action Layer Executor',
            action: 'execution_failed',
            note: err.message
          }
        ];

        this.db.prepare(`
          UPDATE consequential_approvals
          SET execution_status = 'failed', execution_result = ?, audit_history = ?, updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify({ error: err.message }), JSON.stringify(updatedAudit), now, id);

        throw err;
      });
  }
}
