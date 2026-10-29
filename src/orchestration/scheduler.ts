import { DatabaseSync } from 'node:sqlite';
import { SafeLogger } from '../server/services/logger.js';

export class TaskScheduler {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  /**
   * Recovers tasks from an interrupted server shutdown or process kill.
   * Tasks that were left in 'running' state are recovered to 'queued' or evaluated.
   */
  public recoverInterruptedTasks(): { recoveredCount: number; taskIds: string[] } {
    const interruptedTasks = this.db.prepare(`
      SELECT id, title, company_id FROM tasks WHERE status = 'running'
    `).all() as any[];

    const taskIds: string[] = [];
    const now = new Date().toISOString();

    for (const t of interruptedTasks) {
      // Check if there is an open agent_run
      this.db.prepare(`
        UPDATE agent_runs
        SET status = 'failed', error_message = 'Interrupted by server restart/process crash', completed_at = ?
        WHERE task_id = ? AND status = 'started'
      `).run(now, t.id);

      // Reset task to 'queued' for safe re-execution
      this.db.prepare(`
        UPDATE tasks SET status = 'queued', updated_at = ? WHERE id = ?
      `).run(now, t.id);

      taskIds.push(t.id);
      SafeLogger.warn(`Recovered interrupted task "${t.title}" (${t.id}) back to QUEUED status.`);
    }

    return { recoveredCount: interruptedTasks.length, taskIds };
  }
}
