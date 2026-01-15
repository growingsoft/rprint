import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema';

export class Database {
  private db: sqlite3.Database | null = null;

  async connect(dbPath: string): Promise<void> {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async initialize(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    // Use exec() instead of run() to execute multiple SQL statements
    await new Promise<void>((resolve, reject) => {
      this.db!.exec(SCHEMA_SQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Run migrations to add new columns to existing tables
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    // Add scale, quality, and margin columns if they don't exist
    const migrations = [
      `ALTER TABLE print_jobs ADD COLUMN scale TEXT DEFAULT 'noscale'`,
      `ALTER TABLE print_jobs ADD COLUMN quality TEXT DEFAULT 'normal'`,
      `ALTER TABLE print_jobs ADD COLUMN margin_top INTEGER DEFAULT 10`,
      `ALTER TABLE print_jobs ADD COLUMN margin_bottom INTEGER DEFAULT 10`,
      `ALTER TABLE print_jobs ADD COLUMN margin_left INTEGER DEFAULT 10`,
      `ALTER TABLE print_jobs ADD COLUMN margin_right INTEGER DEFAULT 10`
    ];

    for (const migration of migrations) {
      try {
        await this.run(migration);
      } catch (err: any) {
        // Ignore "duplicate column" errors (column already exists)
        if (!err.message.includes('duplicate column')) {
          throw err;
        }
      }
    }
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not connected');
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }
}

export const db = new Database();
