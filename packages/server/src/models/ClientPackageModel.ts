import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../database';

export interface ClientPackage {
  id: string;
  name: string;
  operating_system: 'windows' | 'mac' | 'linux';
  auth_token: string;
  client_id: string;
  default_printer_id: string | null;
  version: string;
  auto_update_enabled: boolean;
  created_at: string;
  last_updated_at: string;
  last_download_at: string | null;
}

export interface CreateClientPackageRequest {
  name: string;
  operating_system: 'windows' | 'mac' | 'linux';
  client_id: string;
  default_printer_id?: string;
}

export class ClientPackageModel {
  /**
   * Create a new client package configuration
   */
  static async create(data: CreateClientPackageRequest): Promise<ClientPackage> {
    const id = uuidv4();
    // Generate JWT token for authentication (30 days expiry)
    const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-secure-string';
    const auth_token = jwt.sign(
      { clientId: data.client_id, packageId: id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await db.run(
      `INSERT INTO client_packages (
        id, name, operating_system, auth_token, client_id, default_printer_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.operating_system,
        auth_token,
        data.client_id,
        data.default_printer_id || null
      ]
    );

    const pkg = await this.findById(id);
    if (!pkg) throw new Error('Failed to create client package');
    return pkg;
  }

  /**
   * Find client package by ID
   */
  static async findById(id: string): Promise<ClientPackage | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM client_packages WHERE id = ?',
      [id]
    );

    if (!row) return undefined;

    return {
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    };
  }

  /**
   * Find client package by auth token
   */
  static async findByAuthToken(auth_token: string): Promise<ClientPackage | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM client_packages WHERE auth_token = ?',
      [auth_token]
    );

    if (!row) return undefined;

    return {
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    };
  }

  /**
   * Get all client packages for a client
   */
  static async findByClientId(client_id: string): Promise<ClientPackage[]> {
    const rows = await db.all<any>(
      'SELECT * FROM client_packages WHERE client_id = ? ORDER BY created_at DESC',
      [client_id]
    );

    return rows.map(row => ({
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    }));
  }

  /**
   * Get all client packages
   */
  static async findAll(): Promise<ClientPackage[]> {
    const rows = await db.all<any>(
      'SELECT * FROM client_packages ORDER BY created_at DESC'
    );

    return rows.map(row => ({
      ...row,
      auto_update_enabled: Boolean(row.auto_update_enabled)
    }));
  }

  /**
   * Update client package
   */
  static async update(id: string, updates: Partial<ClientPackage>): Promise<boolean> {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.default_printer_id !== undefined) {
      fields.push('default_printer_id = ?');
      values.push(updates.default_printer_id);
    }
    if (updates.auto_update_enabled !== undefined) {
      fields.push('auto_update_enabled = ?');
      values.push(updates.auto_update_enabled ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('last_updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE client_packages SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(sql, values);
    return true;
  }

  /**
   * Track download
   */
  static async trackDownload(id: string): Promise<void> {
    await db.run(
      'UPDATE client_packages SET last_download_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  /**
   * Delete client package
   */
  static async delete(id: string): Promise<boolean> {
    await db.run('DELETE FROM client_packages WHERE id = ?', [id]);
    return true;
  }

  /**
   * Regenerate auth token (generates new JWT with 30 days expiry)
   */
  static async regenerateToken(id: string): Promise<string> {
    // Get package to retrieve client_id
    const pkg = await this.findById(id);
    if (!pkg) {
      throw new Error('Package not found');
    }

    // Generate new JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-random-secure-string';
    const new_token = jwt.sign(
      { clientId: pkg.client_id, packageId: id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await db.run(
      `UPDATE client_packages
       SET auth_token = ?, last_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [new_token, id]
    );
    return new_token;
  }
}
