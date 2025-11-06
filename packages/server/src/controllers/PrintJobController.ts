import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrintJobModel } from '../models/PrintJobModel';
import { PrintJobStatus, CreatePrintJobRequest } from '../types';
import fs from 'fs';

export class PrintJobController {
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const clientId = req.clientId!;
      const options: CreatePrintJobRequest = {
        printerId: req.body.printerId,
        copies: parseInt(req.body.copies) || 1,
        colorMode: req.body.colorMode || 'color',
        duplex: req.body.duplex || 'none',
        orientation: req.body.orientation || 'portrait',
        paperSize: req.body.paperSize || 'A4'
      };

      if (!options.printerId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Printer ID is required' });
      }

      const job = await PrintJobModel.create(
        clientId,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        options
      );

      res.status(201).json({ job });
    } catch (error: any) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const status = req.query.status as PrintJobStatus | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const jobs = await PrintJobModel.findAll({
        clientId,
        status,
        limit
      });

      res.json({ jobs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await PrintJobModel.findById(id);

      if (!job) {
        return res.status(404).json({ error: 'Print job not found' });
      }

      // Ensure client can only access their own jobs
      if (job.clientId !== req.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ job });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async cancel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await PrintJobModel.findById(id);

      if (!job) {
        return res.status(404).json({ error: 'Print job not found' });
      }

      if (job.clientId !== req.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (job.status === PrintJobStatus.COMPLETED || job.status === PrintJobStatus.CANCELLED) {
        return res.status(400).json({ error: 'Cannot cancel completed or cancelled job' });
      }

      await PrintJobModel.updateStatus(id, PrintJobStatus.CANCELLED);

      // Clean up file
      if (fs.existsSync(job.filePath)) {
        fs.unlinkSync(job.filePath);
      }

      res.json({ message: 'Job cancelled successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Worker endpoints
  static async pollJobs(req: AuthRequest, res: Response) {
    try {
      const workerId = req.workerId!;
      const printerId = req.query.printerId as string;

      if (!printerId) {
        return res.status(400).json({ error: 'Printer ID is required' });
      }

      const jobs = await PrintJobModel.getPendingJobs(printerId);

      res.json({ jobs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateJobStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, errorMessage } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const job = await PrintJobModel.findById(id);
      if (!job) {
        return res.status(404).json({ error: 'Print job not found' });
      }

      await PrintJobModel.updateStatus(id, status, errorMessage);

      // Clean up file if job is completed or failed
      if (status === PrintJobStatus.COMPLETED || status === PrintJobStatus.FAILED) {
        if (fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
      }

      res.json({ message: 'Job status updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async downloadFile(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await PrintJobModel.findById(id);

      if (!job) {
        return res.status(404).json({ error: 'Print job not found' });
      }

      if (!fs.existsSync(job.filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(job.filePath, job.fileName);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
