import { z } from 'zod';

export type EvidenceType = 'observed_fact' | 'sourced_claim' | 'hypothesis' | 'recommendation';
export type EvidenceConfidence = 'low' | 'medium' | 'high';
export type AssumptionCategory = 'market' | 'product' | 'customer' | 'growth';
export type AssumptionStatus = 'untested' | 'validated' | 'invalidated';
export type ExperimentStatus = 'proposed' | 'in_progress' | 'completed' | 'abandoned';

export interface EvidenceRecord {
  id: string;
  company_id: string;
  statement: string;
  source: string;
  evidence_type: EvidenceType;
  confidence: EvidenceConfidence;
  tags: string[];
  author_agent_id: string;
  created_at: string;
  conflicting_with_id?: string | null;
}

export interface SharedAssumption {
  id: string;
  company_id: string;
  statement: string;
  category: AssumptionCategory;
  confidence: EvidenceConfidence;
  status: AssumptionStatus;
  evidence_ids: string[];
  validated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorRecord {
  id: string;
  company_id: string;
  name: string;
  category: string;
  weakness: string;
  our_advantage: string;
  source_notes: string;
  created_at: string;
}

export interface CustomerRecord {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  contact_title: string;
  source_url: string;
  buying_signal: string;
  qualification_rationale: string;
  confidence: EvidenceConfidence;
  is_excluded: boolean;
  exclusion_reason?: string;
  created_at: string;
}

export interface ExperimentRecord {
  id: string;
  company_id: string;
  title: string;
  hypothesis: string;
  intervention: string;
  primary_metric: string;
  owner: string;
  duration_weeks: number;
  status: ExperimentStatus;
  outcome?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedCompanyMemory {
  company_id: string;
  brief: string;
  target_customer: string;
  value_prop: string;
  approved_positioning?: {
    statement: string;
    wedge_market: string;
    approved_at: string;
    artifact_id: string;
  } | null;
  approved_identity?: {
    voice_pillars: string[];
    palette: string[];
    approved_at: string;
    artifact_id: string;
  } | null;
  evidence_ledger: EvidenceRecord[];
  assumptions: SharedAssumption[];
  competitors: CompetitorRecord[];
  customers: CustomerRecord[];
  experiments: ExperimentRecord[];
  approved_messaging: Array<{ pillar: string; hook: string; proof_point: string }>;
  updated_at: string;
}
