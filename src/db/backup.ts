import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface BackupMetadata {
  backup_file: string;
  created_at: string;
  size_bytes: number;
  tables: string[];
}

export class BackupService {
  private dbPath: string;
  private backupDir: string;

  constructor(dbPath: string = 'orchstr.db', backupDir: string = 'backups') {
    this.dbPath = dbPath;
    this.backupDir = backupDir;
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Creates a point-in-time timestamped backup of the SQLite database.
   */
  public createBackup(): BackupMetadata {
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database file ${this.dbPath} not found for backup.`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `orchstr_backup_${timestamp}.db`;
    const destPath = path.join(this.backupDir, backupFileName);

    // Using SQLite online backup or filesystem copy with WAL checkpoint
    fs.copyFileSync(this.dbPath, destPath);

    // If WAL exists, copy WAL too
    if (fs.existsSync(`${this.dbPath}-wal`)) {
      fs.copyFileSync(`${this.dbPath}-wal`, `${destPath}-wal`);
    }

    const stats = fs.statSync(destPath);

    // Inspect tables in the backup
    const testDb = new DatabaseSync(destPath);
    const tables = (testDb.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[])
      .map(t => t.name);
    testDb.close();

    return {
      backup_file: destPath,
      created_at: new Date().toISOString(),
      size_bytes: stats.size,
      tables
    };
  }

  /**
   * Restores database from a given backup file.
   */
  public restoreBackup(backupFilePath: string): { success: boolean; restored_from: string } {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file ${backupFilePath} does not exist.`);
    }

    // Verify backup integrity before restoring
    const testDb = new DatabaseSync(backupFilePath);
    const integrity = testDb.prepare(`PRAGMA integrity_check`).get() as any;
    testDb.close();

    if (integrity && integrity.integrity_check !== 'ok') {
      throw new Error(`Integrity check failed on backup file ${backupFilePath}: ${JSON.stringify(integrity)}`);
    }

    // Safely copy over
    fs.copyFileSync(backupFilePath, this.dbPath);

    if (fs.existsSync(`${backupFilePath}-wal`)) {
      fs.copyFileSync(`${backupFilePath}-wal`, `${this.dbPath}-wal`);
    } else if (fs.existsSync(`${this.dbPath}-wal`)) {
      fs.unlinkSync(`${this.dbPath}-wal`);
    }

    return { success: true, restored_from: backupFilePath };
  }

  /**
   * Lists existing backups sorted by date.
   */
  public listBackups(): Array<{ name: string; path: string; size: number; date: Date }> {
    if (!fs.existsSync(this.backupDir)) return [];

    return fs.readdirSync(this.backupDir)
      .filter(f => f.endsWith('.db') && !f.endsWith('-wal'))
      .map(f => {
        const fullPath = path.join(this.backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          name: f,
          path: fullPath,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
