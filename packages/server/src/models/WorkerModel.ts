import { db } from '../database';
import { Worker, WorkerStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class WorkerModel {
  static async create(name: string): Promise<Worker> {
    const id = uuidv4();
    const apiKey = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO workers (id, name, api_key, status, last_heartbeat, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, apiKey, WorkerStatus.OFFLINE, now, now]
    );

    const worker = await this.findById(id);
    if (!worker) throw new Error('Failed to create worker');
    return worker;
  }

  static async findById(id: string): Promise<Worker | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM workers WHERE id = ?',
      [id]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async findByApiKey(apiKey: string): Promise<Worker | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM workers WHERE api_key = ?',
      [apiKey]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async findAll(): Promise<Worker[]> {
    const rows = await db.all<any>('SELECT * FROM workers ORDER BY name');
    return rows.map(row => this.mapRow(row));
  }

  static async updateHeartbeat(id: string): Promise<void> {
    await db.run(
      'UPDATE workers SET last_heartbeat = ?, status = ? WHERE id = ?',
      [new Date().toISOString(), WorkerStatus.ONLINE, id]
    );
  }

  static async updateStatus(id: string, status: WorkerStatus): Promise<void> {
    await db.run(
      'UPDATE workers SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  static async delete(id: string): Promise<void> {
    await db.run('DELETE FROM workers WHERE id = ?', [id]);
  }

  static async markOfflineWorkers(timeoutMinutes: number = 5): Promise<void> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    await db.run(
      `UPDATE workers SET status = ? WHERE last_heartbeat < ? AND status = ?`,
      [WorkerStatus.OFFLINE, cutoffTime, WorkerStatus.ONLINE]
    );
  }

  private static mapRow(row: any): Worker {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.api_key,
      status: row.status as WorkerStatus,
      lastHeartbeat: new Date(row.last_heartbeat),
      createdAt: new Date(row.created_at)
    };
  }
}
