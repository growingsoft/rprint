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

    const run = promisify(this.db.run.bind(this.db));
    await run(SCHEMA_SQL);
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    const run = promisify(this.db.run.bind(this.db));
    await run(sql, params);
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not connected');
    const get = promisify(this.db.get.bind(this.db));
    return await get(sql, params) as T | undefined;
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');
    const all = promisify(this.db.all.bind(this.db));
    return await all(sql, params) as T[];
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
