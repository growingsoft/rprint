import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrintJobModel } from '../models/PrintJobModel';
import { PrintJobStatus, CreatePrintJobRequest, CreatePrintJobFromUrlRequest } from '../types';
import { WebhookService } from '../services/WebhookService';
import { WebhookEvent } from '../types';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

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
        paperSize: req.body.paperSize || 'A4',
        quality: req.body.quality || 'normal',
        marginTop: parseInt(req.body.marginTop) || 10,
        marginBottom: parseInt(req.body.marginBottom) || 10,
        marginLeft: parseInt(req.body.marginLeft) || 10,
        marginRight: parseInt(req.body.marginRight) || 10,
        webhookUrl: req.body.webhookUrl
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

  static async createFromUrl(req: AuthRequest, res: Response) {
    let tempFilePath: string | null = null;

    try {
      const clientId = req.clientId!;
      const requestData: CreatePrintJobFromUrlRequest = req.body;

      if (!requestData.url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      if (!requestData.printerId) {
        return res.status(400).json({ error: 'Printer ID is required' });
      }

      // Download file from URL
      const headers = requestData.headers || {};
      const response = await axios.get(requestData.url, {
        responseType: 'arraybuffer',
        headers,
        timeout: 30000, // 30 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max
      });

      // Determine file name and extension
      const urlPath = new URL(requestData.url).pathname;
      let fileName = path.basename(urlPath);
      if (!fileName || fileName === '/') {
        fileName = `document-${uuidv4()}.pdf`;
      }

      // Get MIME type from response or file extension
      const mimeType = response.headers['content-type'] || 'application/octet-stream';

      // Validate MIME type
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'text/plain',
      ];

      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({
          error: 'Unsupported file type',
          details: { mimeType, allowedTypes: allowedMimeTypes },
        });
      }

      // Save file to temp directory
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      tempFilePath = path.join(uploadDir, `${uuidv4()}-${fileName}`);
      fs.writeFileSync(tempFilePath, Buffer.from(response.data));

      const fileSize = fs.statSync(tempFilePath).size;

      // Create print job
      const options: CreatePrintJobRequest = {
        printerId: requestData.printerId,
        copies: requestData.copies || 1,
        colorMode: requestData.colorMode || 'color',
        duplex: requestData.duplex || 'none',
        orientation: requestData.orientation || 'portrait',
        paperSize: requestData.paperSize || 'A4',
        webhookUrl: requestData.webhookUrl,
      };

      const job = await PrintJobModel.create(
        clientId,
        fileName,
        tempFilePath,
        fileSize,
        mimeType,
        options
      );

      res.status(201).json({ job });
    } catch (error: any) {
      // Clean up temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return res.status(408).json({ error: 'Request timeout while downloading file' });
        }
        return res.status(400).json({
          error: 'Failed to download file from URL',
          details: error.message,
        });
      }

      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const status = req.query.status as PrintJobStatus | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const jobs = await PrintJobModel.findAllWithPrinter({
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

      // Get updated job data
      const updatedJob = await PrintJobModel.findById(id);
      if (!updatedJob) {
        return res.status(500).json({ error: 'Failed to retrieve updated job' });
      }

      // Trigger webhooks based on status
      const webhookEventMap: Record<string, WebhookEvent | null> = {
        [PrintJobStatus.ASSIGNED]: WebhookEvent.JOB_ASSIGNED,
        [PrintJobStatus.PRINTING]: WebhookEvent.JOB_PRINTING,
        [PrintJobStatus.COMPLETED]: WebhookEvent.JOB_COMPLETED,
        [PrintJobStatus.FAILED]: WebhookEvent.JOB_FAILED,
        [PrintJobStatus.CANCELLED]: WebhookEvent.JOB_CANCELLED,
        [PrintJobStatus.PENDING]: null,
      };

      const webhookEvent = webhookEventMap[status];
      if (webhookEvent) {
        // Trigger global webhooks
        WebhookService.triggerWebhook(updatedJob.clientId, webhookEvent, updatedJob);

        // Trigger job-specific webhook if provided
        if (updatedJob.webhookUrl) {
          WebhookService.triggerJobWebhook(updatedJob.webhookUrl, webhookEvent, updatedJob);
        }
      }

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
