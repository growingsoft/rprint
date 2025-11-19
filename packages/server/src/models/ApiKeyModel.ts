import { db } from '../database';
import { ApiKey } from '../types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class ApiKeyModel {
  static async create(
    clientId: string,
    name: string,
    expiresInDays: number = 0
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const id = uuidv4();
    const plainKey = `rprint_${process.env.NODE_ENV === 'production' ? 'live' : 'test'}_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    const expiresAt = expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await db.run(
      `INSERT INTO api_keys (id, client_id, key, name, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, clientId, keyHash, name, expiresAt?.toISOString() || null]
    );

    const apiKey: ApiKey = {
      id,
      clientId,
      key: keyHash,
      name,
      createdAt: new Date(),
      expiresAt: expiresAt || undefined,
    };

    return { apiKey, plainKey };
  }

  static async findByKey(plainKey: string): Promise<ApiKey | null> {
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    const row = await db.get<any>(
      `SELECT * FROM api_keys
       WHERE key = ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [keyHash]
    );

    if (!row) {
      return null;
    }

    // Update last used timestamp
    await db.run(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [row.id]
    );

    return {
      id: row.id,
      clientId: row.client_id,
      key: row.key,
      name: row.name,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    };
  }

  static async findByClientId(clientId: string): Promise<ApiKey[]> {
    const rows = await db.all<any>(
      'SELECT * FROM api_keys WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );

    return rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      key: row.key,
      name: row.name,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    }));
  }

  static async delete(id: string, clientId: string): Promise<boolean> {
    await db.run(
      'DELETE FROM api_keys WHERE id = ? AND client_id = ?',
      [id, clientId]
    );
    return true;
  }
}
