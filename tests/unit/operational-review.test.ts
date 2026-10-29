import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { initializeDatabase } from '../../src/db/schema.js';
import { OperationalReviewService } from '../../src/server/services/review-service.js';
import { OrchestrationEngine } from '../../src/orchestration/orchestrator.js';

describe('Production-Quality Operational Review Service', () => {
  const testDbFile = 'test_review.db';
  let db: DatabaseSync;
  let reviewService: OperationalReviewService;
  let orchestrator: OrchestrationEngine;
  let companyId: string;

  beforeEach(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    db = new DatabaseSync(testDbFile);
    initializeDatabase(db);
    reviewService = new OperationalReviewService(db);
    orchestrator = new OrchestrationEngine(db);

    const comp = orchestrator.createCompany({
      name: 'Constraint Test Inc',
      industry: 'SaaS',
      vision: 'Constraint identification',
      brief: 'Brief for review service testing',
      target_customer: 'Founders',
      value_prop: 'Operational velocity',
      assumptions: [
        { statement: 'Assumption 1', confidence: 'medium', status: 'untested', category: 'market' },
        { statement: 'Assumption 2', confidence: 'high', status: 'untested', category: 'product' },
        { statement: 'Assumption 3', confidence: 'low', status: 'untested', category: 'customer' },
        { statement: 'Assumption 4', confidence: 'high', status: 'untested', category: 'growth' }
      ]
    });
    companyId = comp.company.id;
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    } catch {}
  });

  it('generates comprehensive operational review with constraint analysis and experiment proposal', () => {
    // Add task and execute to create pending approval
    const task = orchestrator.createTask(companyId, {
      title: 'Customer Discovery Dossier',
      description: 'Discovery interviews',
      assigned_agent_id: 'agent_customer_research',
      department: 'Research',
      acceptance_criteria: ['Quotes']
    });

    orchestrator.executeTask(companyId, task.id, { mode: 'mock' });

    const review = reviewService.generateReview(companyId);

    // Verify metrics
    expect(review.metrics.total_tasks).toBe(1);
    expect(review.metrics.unresolved_assumptions_count).toBe(4);
    expect(review.metrics.actual_business_metrics).toBeDefined();

    // Verify bottleneck analysis identifies pending managerial review
    expect(review.bottleneck_analysis.current_constraint).toContain('Managerial Approval Bottleneck');
    expect(review.bottleneck_analysis.constraint_severity).toBe('critical');

    // Verify single priority and operating loop
    expect(review.strategic_recommendation.single_priority).toContain('Execute managerial review');
    expect(['build', 'sell', 'observe', 'support', 'learn', 'iterate']).toContain(
      review.strategic_recommendation.operating_loop_phase
    );

    // Verify proposed experiment has owner and review date
    expect(review.proposed_experiment.title).toBeDefined();
    expect(review.proposed_experiment.owner).toBe('Growth Manager');
    expect(review.proposed_experiment.review_date).toBeDefined();

    // Verify markdown report formatting
    expect(review.markdown_report).toContain('# Operational Review & Constraint Analysis');
    expect(review.markdown_report).toContain('Theory of Constraints');
  });
});
