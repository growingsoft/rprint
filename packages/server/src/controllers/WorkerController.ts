import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WorkerModel } from '../models/WorkerModel';

export class WorkerController {
  static async heartbeat(req: AuthRequest, res: Response) {
    try {
      const workerId = req.workerId!;
      await WorkerModel.updateHeartbeat(workerId);

      res.json({ message: 'Heartbeat recorded' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const workers = await WorkerModel.findAll();
      res.json(workers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async get(req: AuthRequest, res: Response) {
    try {
      const workerId = req.workerId!;
      const worker = await WorkerModel.findById(workerId);

      if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
      }

      res.json({ worker });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Import PrinterModel to delete associated printers
      const { PrinterModel } = await import('../models/PrinterModel');

      // Delete all printers associated with this worker first
      await PrinterModel.deleteByWorker(id);

      // Then delete the worker
      await WorkerModel.delete(id);

      res.json({ message: 'Worker and associated printers deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async downloadEnvFile(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const worker = await WorkerModel.findById(id);

      if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
      }

      // Get the server URL from the request
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host || 'localhost:3001';
      const serverUrl = `${protocol}://${host}`;

      // Generate .env file content
      const envContent = `# RPrint Windows Service Configuration
# Generated for worker: ${worker.name}
# Worker ID: ${worker.id}

# Server URL (where the RPrint API is hosted)
SERVER_URL=${serverUrl}

# Worker API Key (keep this secure!)
API_KEY=${worker.apiKey}

# Worker Name (shown in the admin dashboard)
WORKER_NAME=${worker.name}

# Polling interval in milliseconds (how often to check for new print jobs)
POLL_INTERVAL=5000

# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Printer filtering (optional)
# Leave empty or set to "all" to sync all printers
# Or specify comma-separated printer names to sync only specific printers
# Example: ALLOWED_PRINTERS=HP LaserJet,Canon Printer,Epson Workforce
ALLOWED_PRINTERS=all
`;

      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${worker.name}.env"`);
      res.send(envContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
