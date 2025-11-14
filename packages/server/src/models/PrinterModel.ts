import { db } from '../database';
import { Printer, PrinterStatus, PrinterCapabilities } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PrinterModel {
  static async upsert(
    workerId: string,
    name: string,
    displayName: string,
    isDefault: boolean,
    capabilities: PrinterCapabilities,
    description?: string,
    location?: string
  ): Promise<Printer> {
    const existing = await db.get<any>(
      'SELECT id FROM printers WHERE worker_id = ? AND name = ?',
      [workerId, name]
    );

    const now = new Date().toISOString();
    const capabilitiesJson = JSON.stringify(capabilities);

    if (existing) {
      await db.run(
        `UPDATE printers SET
          display_name = ?, is_default = ?, description = ?,
          location = ?, capabilities = ?, status = ?, last_seen = ?
         WHERE id = ?`,
        [displayName, isDefault ? 1 : 0, description, location, capabilitiesJson, PrinterStatus.ONLINE, now, existing.id]
      );
      const printer = await this.findById(existing.id);
      if (!printer) throw new Error('Failed to update printer');
      return printer;
    } else {
      const id = uuidv4();
      await db.run(
        `INSERT INTO printers (
          id, worker_id, name, display_name, is_default,
          description, location, capabilities, status, last_seen, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, workerId, name, displayName, isDefault ? 1 : 0, description, location, capabilitiesJson, PrinterStatus.ONLINE, now, now]
      );
      const printer = await this.findById(id);
      if (!printer) throw new Error('Failed to create printer');
      return printer;
    }
  }

  static async findById(id: string): Promise<Printer | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM printers WHERE id = ?',
      [id]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async findByWorker(workerId: string): Promise<Printer[]> {
    const rows = await db.all<any>(
      'SELECT * FROM printers WHERE worker_id = ?',
      [workerId]
    );

    return rows.map(row => this.mapRow(row));
  }

  static async findAll(): Promise<Printer[]> {
    const rows = await db.all<any>('SELECT * FROM printers ORDER BY display_name');
    return rows.map(row => this.mapRow(row));
  }

  static async updateStatus(id: string, status: PrinterStatus): Promise<void> {
    await db.run(
      'UPDATE printers SET status = ?, last_seen = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  }

  static async delete(id: string): Promise<void> {
    await db.run('DELETE FROM printers WHERE id = ?', [id]);
  }

  static async deleteByWorker(workerId: string): Promise<void> {
    await db.run('DELETE FROM printers WHERE worker_id = ?', [workerId]);
  }

  static async findAllForVirtualPrinter(): Promise<Printer[]> {
    const rows = await db.all(`
      SELECT * FROM printers
      WHERE status = 'online'
      AND virtual_printer_enabled = 1
      ORDER BY is_default DESC, display_name ASC
    `);
    return rows.map(this.mapRow);
  }

  static async updateSettings(id: string, settings: { virtual_printer_enabled?: number, tags?: string }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    if (settings.virtual_printer_enabled !== undefined) {
      updates.push('virtual_printer_enabled = ?');
      params.push(settings.virtual_printer_enabled ? 1 : 0);
    }

    if (settings.tags !== undefined) {
      updates.push('tags = ?');
      params.push(settings.tags);
    }

    if (updates.length === 0) return;

    params.push(id);
    await db.run(
      `UPDATE printers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  private static mapRow(row: any): Printer {
    return {
      id: row.id,
      workerId: row.worker_id,
      name: row.name,
      displayName: row.display_name,
      isDefault: row.is_default === 1,
      status: row.status as PrinterStatus,
      description: row.description,
      location: row.location,
      capabilities: JSON.parse(row.capabilities),
      virtual_printer_enabled: row.virtual_printer_enabled === 1,
      tags: row.tags,
      lastSeen: new Date(row.last_seen),
      createdAt: new Date(row.created_at)
    };
  }
}
