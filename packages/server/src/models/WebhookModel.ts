import { db } from '../database';
import { Webhook, WebhookEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WebhookModel {
  static async create(
    clientId: string,
    url: string,
    events: WebhookEvent[],
    secret?: string,
    active: boolean = true
  ): Promise<Webhook> {
    const id = uuidv4();
    const eventsJson = JSON.stringify(events);

    await db.run(
      `INSERT INTO webhooks (id, client_id, url, events, secret, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, clientId, url, eventsJson, secret || null, active ? 1 : 0]
    );

    return {
      id,
      clientId,
      url,
      events,
      secret,
      active,
      createdAt: new Date(),
    };
  }

  static async findById(id: string): Promise<Webhook | null> {
    const row = await db.get<any>('SELECT * FROM webhooks WHERE id = ?', [id]);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      clientId: row.client_id,
      url: row.url,
      events: JSON.parse(row.events),
      secret: row.secret,
      active: row.active === 1,
      createdAt: new Date(row.created_at),
      lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : undefined,
    };
  }

  static async findByClientId(clientId: string): Promise<Webhook[]> {
    const rows = await db.all<any>(
      'SELECT * FROM webhooks WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );

    return rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      url: row.url,
      events: JSON.parse(row.events),
      secret: row.secret,
      active: row.active === 1,
      createdAt: new Date(row.created_at),
      lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : undefined,
    }));
  }

  static async findActiveByClientAndEvent(
    clientId: string,
    event: WebhookEvent
  ): Promise<Webhook[]> {
    const rows = await db.all<any>(
      `SELECT * FROM webhooks
       WHERE client_id = ? AND active = 1`,
      [clientId]
    );

    return rows
      .map((row) => ({
        id: row.id,
        clientId: row.client_id,
        url: row.url,
        events: JSON.parse(row.events) as WebhookEvent[],
        secret: row.secret,
        active: row.active === 1,
        createdAt: new Date(row.created_at),
        lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : undefined,
      }))
      .filter((webhook) => webhook.events.includes(event));
  }

  static async updateLastTriggered(id: string): Promise<void> {
    await db.run(
      'UPDATE webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  static async update(
    id: string,
    clientId: string,
    updates: Partial<Pick<Webhook, 'url' | 'events' | 'secret' | 'active'>>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.events !== undefined) {
      fields.push('events = ?');
      values.push(JSON.stringify(updates.events));
    }
    if (updates.secret !== undefined) {
      fields.push('secret = ?');
      values.push(updates.secret);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id, clientId);

    await db.run(
      `UPDATE webhooks SET ${fields.join(', ')}
       WHERE id = ? AND client_id = ?`,
      values
    );

    return true;
  }

  static async delete(id: string, clientId: string): Promise<boolean> {
    await db.run(
      'DELETE FROM webhooks WHERE id = ? AND client_id = ?',
      [id, clientId]
    );

    return true;
  }
}
