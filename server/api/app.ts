import express from 'express';
import cors from 'cors';
import { getDatabase } from '../db/connection.js';
import { OrchestrationEngine } from '../domain/orchestrator.js';
import { COMPANY_ROLES, SPECIALIZED_AGENTS } from '../domain/organization.js';
import {
  CreateCompanySchema,
  UpdateContextSchema,
  CreateTaskSchema,
  SubmitApprovalSchema,
  ExecuteTaskSchema,
  CreateDecisionSchema
} from '../domain/types.js';
import { runSeed } from '../db/seed.js';

export function createApp(dbPath?: string) {
  const app = express();
  const db = getDatabase(dbPath);
  const orchestrator = new OrchestrationEngine(db);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Reset / Re-seed database
  app.post('/api/seed', (req, res) => {
    try {
      const result = runSeed(dbPath);
      res.json({ success: true, message: 'Database reseeded successfully', ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // COMPANIES & CONTEXT
  // ==========================================

  app.get('/api/companies', (req, res) => {
    try {
      const companies = orchestrator.listCompanies();
      res.json(companies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/companies', (req, res) => {
    try {
      const parsed = CreateCompanySchema.parse(req.body);
      const result = orchestrator.createCompany(parsed);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Validation error' });
    }
  });

  app.get('/api/companies/:id', (req, res) => {
    try {
      const data = orchestrator.getCompany(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id/context', (req, res) => {
    try {
      const parsed = UpdateContextSchema.parse(req.body);
      const updated = orchestrator.updateCompanyContext(req.params.id, parsed);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // DECISIONS
  // ==========================================

  app.get('/api/companies/:id/decisions', (req, res) => {
    try {
      const decisions = orchestrator.listDecisions(req.params.id);
      res.json(decisions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/decisions', (req, res) => {
    try {
      const parsed = CreateDecisionSchema.parse(req.body);
      const decision = orchestrator.createDecision(req.params.id, parsed);
      res.status(201).json(decision);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // AGENTS & ROLES
  // ==========================================

  app.get('/api/companies/:id/agents', (req, res) => {
    try {
      res.json({
        roles: COMPANY_ROLES,
        agents: SPECIALIZED_AGENTS
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // TASKS & DEPENDENCY ORCHESTRATION
  // ==========================================

  app.get('/api/companies/:id/tasks', (req, res) => {
    try {
      const tasks = orchestrator.listTasks(req.params.id);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/tasks', (req, res) => {
    try {
      const parsed = CreateTaskSchema.parse(req.body);
      const task = orchestrator.createTask(req.params.id, parsed);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/tasks/:taskId', (req, res) => {
    try {
      const task = orchestrator.getTask(req.params.id, req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET ANTIGRAVITY TASK PACKET
  app.get('/api/companies/:id/tasks/:taskId/packet', (req, res) => {
    try {
      const packetData = orchestrator.getTaskPacket(req.params.id, req.params.taskId);
      res.json(packetData);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // EXECUTE TASK (Manual or Mock Runner)
  app.post('/api/companies/:id/tasks/:taskId/execute', (req, res) => {
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

  // RETRY TASK
  app.post('/api/companies/:id/tasks/:taskId/retry', (req, res) => {
    try {
      const retried = orchestrator.retryTask(req.params.id, req.params.taskId);
      res.json(retried);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // RECALCULATE READINESS
  app.post('/api/companies/:id/tasks/recalculate', (req, res) => {
    try {
      const result = orchestrator.recalculateTaskStatuses(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // ARTIFACTS
  // ==========================================

  app.get('/api/companies/:id/artifacts', (req, res) => {
    try {
      const artifacts = orchestrator.listArtifacts(req.params.id);
      res.json(artifacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/artifacts/:artifactId', (req, res) => {
    try {
      const artifact = orchestrator.getArtifact(req.params.id, req.params.artifactId);
      if (!artifact) return res.status(404).json({ error: 'Artifact not found' });
      res.json(artifact);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // APPROVALS
  // ==========================================

  app.get('/api/companies/:id/approvals', (req, res) => {
    try {
      const approvals = orchestrator.listApprovals(req.params.id);
      res.json(approvals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/approvals/:approvalId', (req, res) => {
    try {
      const parsed = SubmitApprovalSchema.parse(req.body);
      const result = orchestrator.submitApproval(req.params.id, req.params.approvalId, parsed);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // ACTIVITY LOG
  // ==========================================

  app.get('/api/companies/:id/activity', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const activity = orchestrator.listActivity(req.params.id, limit);
      res.json(activity);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}
