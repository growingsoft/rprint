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
      // Update printer info but preserve virtual_printer_enabled and tags
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
      // New printer - set virtual_printer_enabled to 1 (enabled) by default
      const id = uuidv4();
      await db.run(
        `INSERT INTO printers (
          id, worker_id, name, display_name, is_default,
          description, location, capabilities, status, virtual_printer_enabled, last_seen, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, workerId, name, displayName, isDefault ? 1 : 0, description, location, capabilitiesJson, PrinterStatus.ONLINE, 1, now, now]
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
    // Deduplicate by printer name - pick the most recently seen printer for each unique name
    const rows = await db.all<any>(`
      SELECT p.* FROM printers p
      INNER JOIN (
        SELECT name, MAX(last_seen) as max_last_seen
        FROM printers
        GROUP BY name
      ) latest ON p.name = latest.name AND p.last_seen = latest.max_last_seen
      ORDER BY p.display_name
    `);
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

  static async removeDuplicates(workerId: string): Promise<number> {
    // Find duplicate printers (same worker_id and name)
    const duplicates = await db.all<any>(`
      SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM printers
      WHERE worker_id = ?
      GROUP BY name
      HAVING count > 1
    `, [workerId]);

    let deletedCount = 0;
    for (const dup of duplicates) {
      const ids = dup.ids.split(',');
      // Keep the first one, delete the rest
      for (let i = 1; i < ids.length; i++) {
        await db.run('DELETE FROM printers WHERE id = ?', [ids[i]]);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  static async findAllForVirtualPrinter(): Promise<Printer[]> {
    // Deduplicate by printer name - pick the most recently seen printer for each unique name
    const rows = await db.all(`
      SELECT p.* FROM printers p
      INNER JOIN (
        SELECT name, MAX(last_seen) as max_last_seen
        FROM printers
        WHERE status = 'online'
        AND virtual_printer_enabled = 1
        GROUP BY name
      ) latest ON p.name = latest.name AND p.last_seen = latest.max_last_seen
      WHERE p.status = 'online'
      AND p.virtual_printer_enabled = 1
      ORDER BY p.is_default DESC, p.display_name ASC
    `);
    return rows.map(this.mapRow);
  }

  static async updateSettings(id: string, settings: {
    virtual_printer_enabled?: number | boolean,
    tags?: string,
    default_paper_size?: string,
    default_orientation?: string,
    default_color_mode?: string,
    default_duplex?: string,
    default_scale?: string
  }): Promise<void> {
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

    if (settings.default_paper_size !== undefined) {
      updates.push('default_paper_size = ?');
      params.push(settings.default_paper_size);
    }

    if (settings.default_orientation !== undefined) {
      updates.push('default_orientation = ?');
      params.push(settings.default_orientation);
    }

    if (settings.default_color_mode !== undefined) {
      updates.push('default_color_mode = ?');
      params.push(settings.default_color_mode);
    }

    if (settings.default_duplex !== undefined) {
      updates.push('default_duplex = ?');
      params.push(settings.default_duplex);
    }

    if (settings.default_scale !== undefined) {
      updates.push('default_scale = ?');
      params.push(settings.default_scale);
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
      default_paper_size: row.default_paper_size,
      default_orientation: row.default_orientation,
      default_color_mode: row.default_color_mode,
      default_duplex: row.default_duplex,
      default_scale: row.default_scale,
      lastSeen: new Date(row.last_seen),
      createdAt: new Date(row.created_at)
    };
  }
}
