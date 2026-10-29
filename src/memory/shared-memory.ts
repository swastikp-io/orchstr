import { DatabaseSync } from 'node:sqlite';
import {
  SharedCompanyMemory,
  EvidenceRecord,
  SharedAssumption,
  CompetitorRecord,
  CustomerRecord,
  ExperimentRecord,
  EvidenceType,
  EvidenceConfidence
} from './types.js';

export class SharedMemoryManager {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      -- Evidence Ledger
      CREATE TABLE IF NOT EXISTS evidence_ledger (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        statement TEXT NOT NULL,
        source TEXT NOT NULL,
        evidence_type TEXT NOT NULL CHECK(evidence_type IN ('observed_fact', 'sourced_claim', 'hypothesis', 'recommendation')),
        confidence TEXT NOT NULL CHECK(confidence IN ('low', 'medium', 'high')),
        tags TEXT NOT NULL DEFAULT '[]',
        author_agent_id TEXT NOT NULL,
        conflicting_with_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- Competitors Ledger
      CREATE TABLE IF NOT EXISTS competitor_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        weakness TEXT NOT NULL,
        our_advantage TEXT NOT NULL,
        source_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- Verified Customer / Prospect Records
      CREATE TABLE IF NOT EXISTS customer_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_title TEXT NOT NULL,
        source_url TEXT NOT NULL,
        buying_signal TEXT NOT NULL,
        qualification_rationale TEXT NOT NULL,
        confidence TEXT NOT NULL CHECK(confidence IN ('low', 'medium', 'high')),
        is_excluded INTEGER NOT NULL DEFAULT 0,
        exclusion_reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- Experiment Backlog
      CREATE TABLE IF NOT EXISTS experiment_backlog (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        hypothesis TEXT NOT NULL,
        intervention TEXT NOT NULL,
        primary_metric TEXT NOT NULL,
        owner TEXT NOT NULL,
        duration_weeks INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('proposed', 'in_progress', 'completed', 'abandoned')),
        outcome TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_evidence_comp ON evidence_ledger(company_id);
      CREATE INDEX IF NOT EXISTS idx_cust_comp ON customer_records(company_id);
      CREATE INDEX IF NOT EXISTS idx_comp_rec ON competitor_records(company_id);
    `);
  }

  public getMemory(companyId: string): SharedCompanyMemory {
    const ctx = this.db.prepare(`SELECT * FROM company_context WHERE company_id = ?`).get(companyId) as any;
    if (!ctx) throw new Error(`Company context for ${companyId} not found.`);

    // Retrieve approved positioning artifact if exists
    const posArtifact = this.db.prepare(`
      SELECT a.* FROM artifacts a
      JOIN tasks t ON t.id = a.task_id
      WHERE a.company_id = ? AND t.assigned_agent_id = 'agent_brand_positioning' AND (t.status = 'approved' OR t.status = 'completed')
      ORDER BY a.version DESC LIMIT 1
    `).get(companyId) as any;

    // Retrieve approved identity artifact if exists
    const idArtifact = this.db.prepare(`
      SELECT a.* FROM artifacts a
      JOIN tasks t ON t.id = a.task_id
      WHERE a.company_id = ? AND t.assigned_agent_id = 'agent_brand_identity' AND (t.status = 'approved' OR t.status = 'completed')
      ORDER BY a.version DESC LIMIT 1
    `).get(companyId) as any;

    const evidenceRows = this.db.prepare(`
      SELECT * FROM evidence_ledger WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId) as any[];

    const competitorRows = this.db.prepare(`
      SELECT * FROM competitor_records WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId) as any[];

    const customerRows = this.db.prepare(`
      SELECT * FROM customer_records WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId) as any[];

    const experimentRows = this.db.prepare(`
      SELECT * FROM experiment_backlog WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId) as any[];

    const assumptionsRaw: any[] = JSON.parse(ctx.assumptions || '[]');

    return {
      company_id: companyId,
      brief: ctx.brief,
      target_customer: ctx.target_customer,
      value_prop: ctx.value_prop,
      approved_positioning: posArtifact ? {
        statement: (JSON.parse(posArtifact.metadata || '{}')).positioning_statement || posArtifact.title,
        wedge_market: (JSON.parse(posArtifact.metadata || '{}')).wedge_market || 'B2B',
        approved_at: posArtifact.created_at,
        artifact_id: posArtifact.id
      } : null,
      approved_identity: idArtifact ? {
        voice_pillars: (JSON.parse(idArtifact.metadata || '{}')).brand_voice_pillars || [],
        palette: (JSON.parse(idArtifact.metadata || '{}')).visual_direction?.dark_palette || [],
        approved_at: idArtifact.created_at,
        artifact_id: idArtifact.id
      } : null,
      evidence_ledger: evidenceRows.map(r => ({
        id: r.id,
        company_id: r.company_id,
        statement: r.statement,
        source: r.source,
        evidence_type: r.evidence_type,
        confidence: r.confidence,
        tags: JSON.parse(r.tags || '[]'),
        author_agent_id: r.author_agent_id,
        conflicting_with_id: r.conflicting_with_id,
        created_at: r.created_at
      })),
      assumptions: assumptionsRaw.map(a => ({
        id: a.id,
        company_id: companyId,
        statement: a.statement,
        category: a.category,
        confidence: a.confidence,
        status: a.status,
        evidence_ids: a.evidence_ids || [],
        created_at: a.created_at || new Date().toISOString(),
        updated_at: a.updated_at || new Date().toISOString()
      })),
      competitors: competitorRows.map(c => ({
        id: c.id,
        company_id: c.company_id,
        name: c.name,
        category: c.category,
        weakness: c.weakness,
        our_advantage: c.our_advantage,
        source_notes: c.source_notes,
        created_at: c.created_at
      })),
      customers: customerRows.map(cu => ({
        id: cu.id,
        company_id: cu.company_id,
        company_name: cu.company_name,
        contact_name: cu.contact_name,
        contact_title: cu.contact_title,
        source_url: cu.source_url,
        buying_signal: cu.buying_signal,
        qualification_rationale: cu.qualification_rationale,
        confidence: cu.confidence,
        is_excluded: cu.is_excluded === 1,
        exclusion_reason: cu.exclusion_reason,
        created_at: cu.created_at
      })),
      experiments: experimentRows.map(e => ({
        id: e.id,
        company_id: e.company_id,
        title: e.title,
        hypothesis: e.hypothesis,
        intervention: e.intervention,
        primary_metric: e.primary_metric,
        owner: e.owner,
        duration_weeks: e.duration_weeks,
        status: e.status,
        outcome: e.outcome,
        created_at: e.created_at,
        updated_at: e.updated_at
      })),
      approved_messaging: posArtifact && JSON.parse(posArtifact.metadata || '{}').messaging_pillars
        ? JSON.parse(posArtifact.metadata || '{}').messaging_pillars
        : [],
      updated_at: ctx.updated_at
    };
  }

  public addEvidence(companyId: string, data: {
    statement: string;
    source: string;
    evidence_type: EvidenceType;
    confidence: EvidenceConfidence;
    tags?: string[];
    author_agent_id: string;
    conflicting_with_id?: string;
  }): EvidenceRecord {
    const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const tags = data.tags || [];

    this.db.prepare(`
      INSERT INTO evidence_ledger (id, company_id, statement, source, evidence_type, confidence, tags, author_agent_id, conflicting_with_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, companyId, data.statement, data.source, data.evidence_type, data.confidence,
      JSON.stringify(tags), data.author_agent_id, data.conflicting_with_id || null, now
    );

    return {
      id,
      company_id: companyId,
      statement: data.statement,
      source: data.source,
      evidence_type: data.evidence_type,
      confidence: data.confidence,
      tags,
      author_agent_id: data.author_agent_id,
      conflicting_with_id: data.conflicting_with_id,
      created_at: now
    };
  }

  public addCustomerRecord(companyId: string, record: Omit<CustomerRecord, 'id' | 'company_id' | 'created_at'>): CustomerRecord {
    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO customer_records (id, company_id, company_name, contact_name, contact_title, source_url, buying_signal, qualification_rationale, confidence, is_excluded, exclusion_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, companyId, record.company_name, record.contact_name, record.contact_title, record.source_url,
      record.buying_signal, record.qualification_rationale, record.confidence, record.is_excluded ? 1 : 0,
      record.exclusion_reason || null, now
    );

    return {
      id,
      company_id: companyId,
      ...record,
      created_at: now
    };
  }

  public addExperiment(companyId: string, exp: Omit<ExperimentRecord, 'id' | 'company_id' | 'created_at' | 'updated_at'>): ExperimentRecord {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO experiment_backlog (id, company_id, title, hypothesis, intervention, primary_metric, owner, duration_weeks, status, outcome, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, companyId, exp.title, exp.hypothesis, exp.intervention, exp.primary_metric,
      exp.owner, exp.duration_weeks, exp.status, exp.outcome || null, now, now
    );

    return {
      id,
      company_id: companyId,
      ...exp,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Enforces manager review gate: Outreach & marketing must NOT consume unapproved positioning.
   */
  public validateGateForAgent(companyId: string, agentId: string): { isPermitted: boolean; reason?: string } {
    const memory = this.getMemory(companyId);

    if (agentId === 'agent_brand_identity' || agentId === 'agent_email_outreach' || agentId === 'agent_marketing_newsletter') {
      if (!memory.approved_positioning) {
        return {
          isPermitted: false,
          reason: `Gate blocked: Specialist [${agentId}] requires an approved Brand Positioning deliverable before executing.`
        };
      }
    }

    if (agentId === 'agent_email_outreach') {
      // Must also have verified prospects
      if (memory.customers.filter(c => !c.is_excluded).length === 0) {
        return {
          isPermitted: false,
          reason: `Gate blocked: Email Outreach requires at least one verified non-excluded prospect record in shared memory.`
        };
      }
    }

    return { isPermitted: true };
  }

  /**
   * Surfaces conflicting evidence pairs for human manager resolution.
   */
  public findConflictingEvidence(companyId: string): Array<{ evidenceA: EvidenceRecord; evidenceB: EvidenceRecord }> {
    const evidence = this.db.prepare(`SELECT * FROM evidence_ledger WHERE company_id = ?`).all(companyId) as any[];
    const result: Array<{ evidenceA: EvidenceRecord; evidenceB: EvidenceRecord }> = [];

    for (const r of evidence) {
      if (r.conflicting_with_id) {
        const opposing = evidence.find(e => e.id === r.conflicting_with_id);
        if (opposing) {
          result.push({
            evidenceA: { ...r, tags: JSON.parse(r.tags || '[]') },
            evidenceB: { ...opposing, tags: JSON.parse(opposing.tags || '[]') }
          });
        }
      }
    }

    return result;
  }
}
