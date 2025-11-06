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
      res.json({ workers });
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
}
