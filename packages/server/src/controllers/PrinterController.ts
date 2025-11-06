import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrinterModel } from '../models/PrinterModel';

export class PrinterController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const printers = await PrinterModel.findAll();
      res.json({ printers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const printer = await PrinterModel.findById(id);

      if (!printer) {
        return res.status(404).json({ error: 'Printer not found' });
      }

      res.json({ printer });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async syncPrinters(req: AuthRequest, res: Response) {
    try {
      const { printers } = req.body;
      const workerId = req.workerId!;

      if (!Array.isArray(printers)) {
        return res.status(400).json({ error: 'Printers must be an array' });
      }

      // Delete existing printers for this worker
      await PrinterModel.deleteByWorker(workerId);

      // Insert new printers
      const results = [];
      for (const p of printers) {
        const printer = await PrinterModel.upsert(
          workerId,
          p.name,
          p.displayName,
          p.isDefault || false,
          p.capabilities,
          p.description,
          p.location
        );
        results.push(printer);
      }

      res.json({ printers: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
