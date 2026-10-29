import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { initializeDatabase } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbFilePath?: string): DatabaseSync {
  if (dbInstance && !dbFilePath) {
    return dbInstance;
  }

  const targetPath = dbFilePath || process.env.DATABASE_PATH || 'orchstr.db';

  const dir = path.dirname(targetPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  initializeDatabase(db);

  if (!dbFilePath) {
    dbInstance = db;
  }

  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
