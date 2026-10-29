import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { initializeDatabase } from '../../src/db/schema.js';
import { BackupService } from '../../src/db/backup.js';
import { TaskScheduler } from '../../src/orchestration/scheduler.js';
import { OrchestrationEngine } from '../../src/orchestration/orchestrator.js';

describe('Database Backup, Recovery, and Process Resilience', () => {
  const testDbFile = 'test_backup.db';
  const testBackupDir = 'test_backups';
  let db: DatabaseSync;
  let backupService: BackupService;
  let orchestrator: OrchestrationEngine;
  let scheduler: TaskScheduler;

  beforeEach(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    if (fs.existsSync(testBackupDir)) {
      try { fs.rmSync(testBackupDir, { recursive: true, force: true }); } catch {}
    }

    db = new DatabaseSync(testDbFile);
    initializeDatabase(db);
    backupService = new BackupService(testDbFile, testBackupDir);
    orchestrator = new OrchestrationEngine(db);
    scheduler = new TaskScheduler(db);
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
      if (fs.existsSync(testBackupDir)) fs.rmSync(testBackupDir, { recursive: true, force: true });
    } catch {}
  });

  it('creates timestamped database backup and lists it with metadata', () => {
    // Add some test data
    orchestrator.createCompany({
      name: 'Backup Co',
      industry: 'Data Storage',
      vision: 'Resilient storage',
      brief: 'Brief for backup test',
      target_customer: 'Engineers',
      value_prop: 'Bulletproof recovery'
    });

    const backupMeta = backupService.createBackup();
    expect(backupMeta.backup_file).toBeDefined();
    expect(fs.existsSync(backupMeta.backup_file)).toBe(true);
    expect(backupMeta.size_bytes).toBeGreaterThan(0);
    expect(backupMeta.tables).toContain('companies');
    expect(backupMeta.tables).toContain('consequential_approvals');

    const backups = backupService.listBackups();
    expect(backups.length).toBe(1);
    expect(backups[0].path).toBe(backupMeta.backup_file);
  });

  it('restores database from backup verified by PRAGMA integrity check', () => {
    const comp = orchestrator.createCompany({
      name: 'Original Co',
      industry: 'Original Industry',
      vision: 'Original vision',
      brief: 'Original brief',
      target_customer: 'Original customers',
      value_prop: 'Original value'
    });

    const backupMeta = backupService.createBackup();

    // Now modify the live database by creating another company
    orchestrator.createCompany({
      name: 'Second Co',
      industry: 'Second Industry',
      vision: 'Second vision',
      brief: 'Second brief',
      target_customer: 'Second customers',
      value_prop: 'Second value'
    });

    expect(orchestrator.listCompanies().length).toBe(2);

    // Close db before restoring
    db.close();

    // Restore from backup
    const res = backupService.restoreBackup(backupMeta.backup_file);
    expect(res.success).toBe(true);

    // Reopen and verify state reverted to point of backup (only 1 company)
    db = new DatabaseSync(testDbFile);
    orchestrator = new OrchestrationEngine(db);
    const restoredCompanies = orchestrator.listCompanies();
    expect(restoredCompanies.length).toBe(1);
    expect(restoredCompanies[0].name).toBe('Original Co');
  });

  it('recovers interrupted tasks from abnormal shutdowns back to queued status', () => {
    const comp = orchestrator.createCompany({
      name: 'Interrupted Co',
      industry: 'Cloud',
      vision: 'Vision',
      brief: 'Brief',
      target_customer: 'Users',
      value_prop: 'Value'
    });

    const task = orchestrator.createTask(comp.company.id, {
      title: 'Long Running Task',
      description: 'Simulated task interrupted mid-run',
      assigned_agent_id: 'agent_customer_research',
      department: 'Research',
      acceptance_criteria: ['Done']
    });

    // Manually set task to 'running' to simulate an interrupted in-flight run
    db.prepare(`UPDATE tasks SET status = 'running' WHERE id = ?`).run(task.id);
    db.prepare(`
      INSERT INTO agent_runs (id, company_id, task_id, agent_id, status, input_packet, started_at)
      VALUES ('run_orphaned', ?, ?, 'agent_customer_research', 'started', '{}', ?)
    `).run(comp.company.id, task.id, new Date().toISOString());

    // Run scheduler recovery
    const recovery = scheduler.recoverInterruptedTasks();
    expect(recovery.recoveredCount).toBe(1);
    expect(recovery.taskIds).toContain(task.id);

    // Verify task status was reset to 'queued' for safe re-execution
    const recoveredTask = orchestrator.getTask(comp.company.id, task.id);
    expect(recoveredTask?.status).toBe('queued');

    // Verify orphaned agent_run was marked as failed
    const run = db.prepare(`SELECT * FROM agent_runs WHERE id = 'run_orphaned'`).get() as any;
    expect(run.status).toBe('failed');
    expect(run.error_message).toContain('Interrupted by server restart');
  });
});
