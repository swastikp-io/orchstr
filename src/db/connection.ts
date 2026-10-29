import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeDatabase } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getRepoRoot(): string {
  try {
    let curr = path.dirname(fileURLToPath(import.meta.url));
    while (curr && curr !== path.dirname(curr)) {
      if (fs.existsSync(path.join(curr, 'package.json'))) {
        return curr;
      }
      curr = path.dirname(curr);
    }
  } catch {
    // Fallback
  }
  return process.cwd();
}

export function resolveDbPath(customPath?: string): string {
  const target = customPath || process.env.ORCHSTR_DB_PATH || process.env.DATABASE_PATH || 'orchstr.db';
  if (path.isAbsolute(target)) {
    return target;
  }
  return path.resolve(getRepoRoot(), target);
}

export function getDatabase(dbFilePath?: string): DatabaseSync {
  if (dbInstance && !dbFilePath) {
    return dbInstance;
  }

  const targetPath = resolveDbPath(dbFilePath);

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
