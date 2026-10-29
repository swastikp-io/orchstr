import { Router } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { OrchestrationEngine } from '../../orchestration/orchestrator.js';
import { SharedMemoryManager } from '../../memory/shared-memory.js';
import { ApprovalEngine } from '../approvals/approval-engine.js';
import { SafeActionLayer } from '../approvals/action-layer.js';
import { OperationalReviewService } from '../services/review-service.js';
import { BackupService } from '../../db/backup.js';
import { COMPANY_ROLES } from '../../agents/managers/roles.js';
import { SPECIALIZED_AGENTS } from '../../agents/definitions/agents.js';
import {
  CreateCompanySchema,
  UpdateContextSchema,
  CreateTaskSchema,
  SubmitApprovalSchema,
  ExecuteTaskSchema,
  CreateDecisionSchema
} from '../../shared/schemas/index.js';
import { runSeed } from '../../db/seed.js';

export function createApiRouter(db: DatabaseSync): Router {
  const router = Router();
  const orchestrator = new OrchestrationEngine(db);
  const memoryManager = new SharedMemoryManager(db);
  const approvalEngine = new ApprovalEngine(db);
  const actionLayer = new SafeActionLayer(approvalEngine);
  const reviewService = new OperationalReviewService(db);
  const backupService = new BackupService();

  // Health
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Seed / Reset
  router.post('/seed', (req, res) => {
    try {
      const result = runSeed();
      res.json({ success: true, message: 'Database reseeded successfully', ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Companies
  router.get('/companies', (req, res) => {
    try {
      const companies = orchestrator.listCompanies();
      res.json(companies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies', (req, res) => {
    try {
      const parsed = CreateCompanySchema.parse(req.body);
      const result = orchestrator.createCompany(parsed);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/companies/:id', (req, res) => {
    try {
      const data = orchestrator.getCompany(req.params.id);
      if (!data) return res.status(404).json({ error: 'Company not found' });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/companies/:id/context', (req, res) => {
    try {
      const parsed = UpdateContextSchema.parse(req.body);
      const updated = orchestrator.updateCompanyContext(req.params.id, parsed);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Decisions
  router.get('/companies/:id/decisions', (req, res) => {
    try {
      const decisions = orchestrator.listDecisions(req.params.id);
      res.json(decisions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies/:id/decisions', (req, res) => {
    try {
      const parsed = CreateDecisionSchema.parse(req.body);
      const decision = orchestrator.createDecision(req.params.id, parsed);
      res.status(201).json(decision);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Agents & Roles
  router.get('/companies/:id/agents', (req, res) => {
    res.json({ roles: COMPANY_ROLES, agents: SPECIALIZED_AGENTS });
  });

  // Tasks & Packets
  router.get('/companies/:id/tasks', (req, res) => {
    try {
      const tasks = orchestrator.listTasks(req.params.id);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies/:id/tasks', (req, res) => {
    try {
      const parsed = CreateTaskSchema.parse(req.body);
      const task = orchestrator.createTask(req.params.id, parsed);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/companies/:id/tasks/:taskId/packet', (req, res) => {
    try {
      const packetData = orchestrator.getTaskPacket(req.params.id, req.params.taskId);
      res.json(packetData);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/tasks/:taskId/execute', (req, res) => {
    try {
      const parsed = ExecuteTaskSchema.parse(req.body);
      const result = orchestrator.executeTask(req.params.id, req.params.taskId, {
        mode: parsed.mode,
        outputData: parsed.output,
        artifactContent: parsed.artifact_content,
        artifactTitle: parsed.artifact_title,
        artifactType: parsed.artifact_type
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/tasks/:taskId/retry', (req, res) => {
    try {
      const retried = orchestrator.retryTask(req.params.id, req.params.taskId);
      res.json(retried);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/tasks/recalculate', (req, res) => {
    try {
      const result = orchestrator.recalculateTaskStatuses(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Artifacts
  router.get('/companies/:id/artifacts', (req, res) => {
    try {
      const artifacts = orchestrator.listArtifacts(req.params.id);
      res.json(artifacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/companies/:id/artifacts/:artifactId', (req, res) => {
    try {
      const artifact = orchestrator.getArtifact(req.params.id, req.params.artifactId);
      if (!artifact) return res.status(404).json({ error: 'Artifact not found' });
      res.json(artifact);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Standard Approvals
  router.get('/companies/:id/approvals', (req, res) => {
    try {
      const approvals = orchestrator.listApprovals(req.params.id);
      res.json(approvals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies/:id/approvals/:approvalId', (req, res) => {
    try {
      const parsed = SubmitApprovalSchema.parse(req.body);
      const result = orchestrator.submitApproval(req.params.id, req.params.approvalId, parsed);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Consequential Approvals & Actions
  router.get('/companies/:id/consequential-approvals', (req, res) => {
    try {
      const list = approvalEngine.listApprovals(req.params.id);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies/:id/consequential-approvals', (req, res) => {
    try {
      const reqData = req.body;
      const created = approvalEngine.createRequest({
        company_id: req.params.id,
        task_id: reqData.task_id,
        action_type: reqData.action_type,
        payload: reqData.payload,
        reason: reqData.reason,
        expected_outcome: reqData.expected_outcome,
        affected_resources: reqData.affected_resources || {},
        requesting_agent_id: reqData.requesting_agent_id,
        reviewer_role: reqData.reviewer_role,
        risks: reqData.risks || [],
        reversibility: reqData.reversibility || 'irreversible'
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/consequential-approvals/:apprId/approve', (req, res) => {
    try {
      const reviewer = req.body.reviewer || 'Founder / CEO';
      const feedback = req.body.feedback;
      const result = approvalEngine.approve(req.params.apprId, reviewer, feedback);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/consequential-approvals/:apprId/reject', (req, res) => {
    try {
      const reviewer = req.body.reviewer || 'Founder / CEO';
      const feedback = req.body.feedback || 'Rejected by Founder';
      const result = approvalEngine.reject(req.params.apprId, reviewer, feedback);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/consequential-approvals/:apprId/execute', async (req, res) => {
    try {
      const appr = approvalEngine.getApproval(req.params.apprId);
      if (!appr) return res.status(404).json({ error: 'Approval request not found' });

      let result;
      if (appr.action_type === 'send_outbound_emails') {
        result = await actionLayer.executeSendOutboundEmails(appr.id, req.body.payload || appr.payload);
      } else if (appr.action_type === 'publish_newsletter') {
        result = await actionLayer.executePublishNewsletter(appr.id, req.body.payload || appr.payload);
      } else {
        result = await actionLayer.executeGenericAction(appr.id, appr.action_type, req.body.payload || appr.payload);
      }
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Shared Memory
  router.get('/companies/:id/memory', (req, res) => {
    try {
      const memory = memoryManager.getMemory(req.params.id);
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/companies/:id/memory/evidence', (req, res) => {
    try {
      const evidence = memoryManager.addEvidence(req.params.id, req.body);
      res.status(201).json(evidence);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/memory/customers', (req, res) => {
    try {
      const cust = memoryManager.addCustomerRecord(req.params.id, req.body);
      res.status(201).json(cust);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/companies/:id/memory/experiments', (req, res) => {
    try {
      const exp = memoryManager.addExperiment(req.params.id, req.body);
      res.status(201).json(exp);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Operational Review Report
  router.get('/companies/:id/review', (req, res) => {
    try {
      const review = reviewService.generateReview(req.params.id);
      res.json(review);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Backups
  router.post('/backup', (req, res) => {
    try {
      const meta = backupService.createBackup();
      res.json(meta);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/backup', (req, res) => {
    try {
      const list = backupService.listBackups();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Activity
  router.get('/companies/:id/activity', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const activity = orchestrator.listActivity(req.params.id, limit);
      res.json(activity);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
