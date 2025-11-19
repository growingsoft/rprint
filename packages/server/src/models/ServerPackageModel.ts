import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../database';

export interface ServerPackage {
  id: string;
  name: string;
  worker_id: string;
  api_key: string;
  selected_printers: string | null;
  version: string;
  auto_update_enabled: boolean;
  created_at: string;
  last_updated_at: string;
  last_download_at: string | null;
}

export interface CreateServerPackageRequest {
  name: string;
  worker_id: string;
  api_key: string;
  selected_printers?: string[];
}

export class ServerPackageModel {
  /**
   * Create a new server package configuration
   */
  static async create(data: CreateServerPackageRequest): Promise<ServerPackage> {
    const id = uuidv4();
    const selected_printers = data.selected_printers ? JSON.stringify(data.selected_printers) : null;

    await db.run(
      `INSERT INTO server_packages (
        id, name, worker_id, api_key, selected_printers
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.worker_id,
        data.api_key,
        selected_printers
      ]
    );

    const pkg = await this.findById(id);
    if (!pkg) throw new Error('Failed to create server package');
    return pkg;
  }

  /**
   * Find server package by ID
   */
  static async findById(id: string): Promise<ServerPackage | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM server_packages WHERE id = ?',
      [id]
    );

    if (!row) return undefined;

    return {
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    };
  }

  /**
   * Find server package by worker ID
   */
  static async findByWorkerId(worker_id: string): Promise<ServerPackage | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM server_packages WHERE worker_id = ?',
      [worker_id]
    );

    if (!row) return undefined;

    return {
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    };
  }

  /**
   * Get all server packages
   */
  static async findAll(): Promise<ServerPackage[]> {
    const rows = await db.all<any>(
      'SELECT * FROM server_packages ORDER BY created_at DESC'
    );

    return rows.map(row => ({
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    }));
  }

  /**
   * Update server package
   */
  static async update(id: string, updates: Partial<ServerPackage>): Promise<boolean> {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.selected_printers !== undefined) {
      fields.push('selected_printers = ?');
      values.push(updates.selected_printers);
    }
    if (updates.auto_update_enabled !== undefined) {
      fields.push('auto_update_enabled = ?');
      values.push(updates.auto_update_enabled ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('last_updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE server_packages SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(sql, values);
    return true;
  }

  /**
   * Track download
   */
  static async trackDownload(id: string): Promise<void> {
    await db.run(
      'UPDATE server_packages SET last_download_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  /**
   * Delete server package
   */
  static async delete(id: string): Promise<boolean> {
    await db.run('DELETE FROM server_packages WHERE id = ?', [id]);
    return true;
  }

  /**
   * Regenerate API key
   */
  static async regenerateApiKey(id: string): Promise<string> {
    const new_key = crypto.randomBytes(32).toString('hex');
    await db.run(
      `UPDATE server_packages
       SET api_key = ?, last_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [new_key, id]
    );
    return new_key;
  }
}
