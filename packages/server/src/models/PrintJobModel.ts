import { db } from '../database';
import { PrintJob, PrintJobStatus, CreatePrintJobRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PrintJobModel {
  static async create(
    clientId: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
    options: CreatePrintJobRequest,
    thumbnailPath?: string | null
  ): Promise<PrintJob> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO print_jobs (
        id, client_id, printer_id, file_name, file_path, file_size, mime_type,
        status, copies, color_mode, duplex, orientation, paper_size, scale, webhook_url, thumbnail_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        clientId,
        options.printerId,
        fileName,
        filePath,
        fileSize,
        mimeType,
        PrintJobStatus.PENDING,
        options.copies || 1,
        options.colorMode || 'color',
        options.duplex || 'none',
        options.orientation || 'portrait',
        options.paperSize || 'A4',
        options.scale || 'noscale',
        options.webhookUrl || null,
        thumbnailPath || null,
        now
      ]
    );

    const job = await this.findById(id);
    if (!job) throw new Error('Failed to create print job');
    return job;
  }

  static async findById(id: string): Promise<PrintJob | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM print_jobs WHERE id = ?',
      [id]
    );

    return row ? this.mapRow(row) : undefined;
  }

  static async findAll(filters?: {
    clientId?: string;
    printerId?: string;
    status?: PrintJobStatus;
    limit?: number;
  }): Promise<PrintJob[]> {
    let sql = 'SELECT * FROM print_jobs WHERE 1=1';
    const params: any[] = [];

    if (filters?.clientId) {
      sql += ' AND client_id = ?';
      params.push(filters.clientId);
    }
    if (filters?.printerId) {
      sql += ' AND printer_id = ?';
      params.push(filters.printerId);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await db.all<any>(sql, params);
    return rows.map(row => this.mapRow(row));
  }

  static async findAllWithPrinter(filters?: {
    clientId?: string;
    printerId?: string;
    status?: PrintJobStatus;
    limit?: number;
  }): Promise<any[]> {
    let sql = `
      SELECT
        pj.*,
        p.display_name as printer_name,
        p.status as printer_status,
        w.name as worker_name,
        c.display_name as client_name
      FROM print_jobs pj
      LEFT JOIN printers p ON pj.printer_id = p.id
      LEFT JOIN workers w ON p.worker_id = w.id
      LEFT JOIN clients c ON pj.client_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.clientId) {
      sql += ' AND pj.client_id = ?';
      params.push(filters.clientId);
    }
    if (filters?.printerId) {
      sql += ' AND pj.printer_id = ?';
      params.push(filters.printerId);
    }
    if (filters?.status) {
      sql += ' AND pj.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY pj.created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await db.all<any>(sql, params);
    return rows.map(row => ({
      ...this.mapRow(row),
      printer_name: row.printer_name || 'Unknown Printer',
      printerStatus: row.printer_status || 'offline',
      worker_name: row.worker_name || 'Unknown Server',
      client_name: row.client_name || 'Unknown Client'
    }));
  }

  static async updateStatus(
    id: string,
    status: PrintJobStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (status === PrintJobStatus.ASSIGNED) {
      updates.push('assigned_at = ?');
      params.push(new Date().toISOString());
    } else if (status === PrintJobStatus.COMPLETED || status === PrintJobStatus.FAILED) {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    }

    if (errorMessage) {
      updates.push('error_message = ?');
      params.push(errorMessage);
    }

    params.push(id);

    await db.run(
      `UPDATE print_jobs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async getPendingJobs(printerId: string): Promise<PrintJob[]> {
    const rows = await db.all<any>(
      `SELECT * FROM print_jobs
       WHERE printer_id = ? AND status = ?
       ORDER BY created_at ASC`,
      [printerId, PrintJobStatus.PENDING]
    );

    return rows.map(row => this.mapRow(row));
  }

  static async delete(id: string): Promise<void> {
    await db.run('DELETE FROM print_jobs WHERE id = ?', [id]);
  }

  private static mapRow(row: any): PrintJob {
    return {
      id: row.id,
      clientId: row.client_id,
      printerId: row.printer_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      status: row.status as PrintJobStatus,
      copies: row.copies,
      colorMode: row.color_mode,
      duplex: row.duplex,
      orientation: row.orientation,
      paperSize: row.paper_size,
      scale: row.scale,
      webhookUrl: row.webhook_url,
      thumbnailPath: row.thumbnail_path || undefined,
      createdAt: new Date(row.created_at),
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message
    };
  }
}
