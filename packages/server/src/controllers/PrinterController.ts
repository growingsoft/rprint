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

  static async removeDuplicates(req: AuthRequest, res: Response) {
    try {
      const { workerId } = req.params;
      const deletedCount = await PrinterModel.removeDuplicates(workerId);
      res.json({
        message: `Removed ${deletedCount} duplicate printers`,
        deletedCount
      });
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

      // Upsert printers (update existing or insert new)
      // This preserves printer IDs and settings like virtual_printer_enabled and tags
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

      // Mark printers that weren't in the sync as offline
      const syncedPrinterNames = printers.map((p: any) => p.name);
      const existingPrinters = await PrinterModel.findByWorker(workerId);
      for (const existing of existingPrinters) {
        if (!syncedPrinterNames.includes(existing.name)) {
          await PrinterModel.updateStatus(existing.id, 'offline' as any);
        }
      }

      res.json({ printers: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get printers enabled for virtual printer
  static async listForVirtualPrinter(req: AuthRequest, res: Response) {
    try {
      const printers = await PrinterModel.findAllForVirtualPrinter();
      res.json({ printers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update printer settings (virtual_printer_enabled, tags, defaults)
  static async updateSettings(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { virtual_printer_enabled, tags, default_paper_size, default_orientation, default_color_mode, default_duplex } = req.body;

      const printer = await PrinterModel.findById(id);
      if (!printer) {
        return res.status(404).json({ error: 'Printer not found' });
      }

      await PrinterModel.updateSettings(id, {
        virtual_printer_enabled: virtual_printer_enabled !== undefined ? virtual_printer_enabled : printer.virtual_printer_enabled,
        tags: tags !== undefined ? tags : printer.tags,
        default_paper_size: default_paper_size !== undefined ? default_paper_size : printer.default_paper_size,
        default_orientation: default_orientation !== undefined ? default_orientation : printer.default_orientation,
        default_color_mode: default_color_mode !== undefined ? default_color_mode : printer.default_color_mode,
        default_duplex: default_duplex !== undefined ? default_duplex : printer.default_duplex
      });

      const updated = await PrinterModel.findById(id);
      res.json({ printer: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
