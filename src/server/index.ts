import { createApp } from './app.js';
import { runSeed } from '../db/seed.js';
import { getDatabase } from '../db/connection.js';
import { TaskScheduler } from '../orchestration/scheduler.js';
import { SafeLogger } from './services/logger.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = createApp();

const db = getDatabase();
const companyCount = (db.prepare(`SELECT count(*) as cnt FROM companies`).get() as any)?.cnt || 0;
if (companyCount === 0) {
  SafeLogger.info('Database empty. Running canonical seed...');
  runSeed();
}

// Recover any interrupted tasks from previous abnormal shutdowns
const scheduler = new TaskScheduler(db);
const recovery = scheduler.recoverInterruptedTasks();
if (recovery.recoveredCount > 0) {
  SafeLogger.info(`Startup Task Recovery: Reset ${recovery.recoveredCount} interrupted tasks to queued.`);
}

app.listen(PORT, () => {
  SafeLogger.info(`ORCHSTR server running on port ${PORT}`);
  SafeLogger.info(`Health check: http://localhost:${PORT}/api/health`);
});
