import { DatabaseSync } from 'node:sqlite';

export const SCHEMA_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT NOT NULL,
  vision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Company Context
CREATE TABLE IF NOT EXISTS company_context (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  brief TEXT NOT NULL,
  target_customer TEXT NOT NULL,
  value_prop TEXT NOT NULL,
  assumptions TEXT NOT NULL DEFAULT '[]',
  constraints TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 3. Decisions
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  decided_by TEXT NOT NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 4. Agents (Definitions)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  purpose TEXT NOT NULL,
  instructions TEXT NOT NULL,
  required_inputs TEXT NOT NULL DEFAULT '[]',
  output_schema TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL DEFAULT '[]',
  permitted_actions TEXT NOT NULL DEFAULT '[]',
  is_manager INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 5. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'blocked', 'review', 'approved', 'completed', 'failed')),
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  inputs TEXT NOT NULL DEFAULT '{}',
  outputs TEXT,
  acceptance_criteria TEXT NOT NULL DEFAULT '[]',
  parallelizable INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  missing_inputs TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
);

-- 6. Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  depends_on_task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(company_id, task_id, depends_on_task_id)
);

-- 7. Artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('markdown', 'document', 'dataset', 'code', 'strategy', 'analysis')),
  content TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 8. Standard Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  artifact_id TEXT,
  reviewer_role TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  feedback TEXT,
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL
);

-- 9. Consequential Approvals (Server-Enforced Action Layer)
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

-- 10. Evidence Ledger (Shared Memory)
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

-- 11. Competitors Ledger
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

-- 12. Verified Customer Records
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

-- 13. Experiment Backlog
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

-- 14. Activity Events (Audit Log)
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 15. Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed')),
  input_packet TEXT NOT NULL,
  output_result TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_company ON artifacts(company_id);
CREATE INDEX IF NOT EXISTS idx_conseq_comp ON consequential_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_comp ON evidence_ledger(company_id);
`;

export function initializeDatabase(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
}
