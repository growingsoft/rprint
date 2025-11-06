import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { WorkerModel } from '../models/WorkerModel';
import { ClientModel } from '../models/ClientModel';

export interface AuthRequest extends Request {
  clientId?: string;
  workerId?: string;
}

export const authenticateClient = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { clientId: string };

    const client = await ClientModel.findById(decoded.clientId);
    if (!client) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.clientId = client.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authenticateWorker = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const worker = await WorkerModel.findByApiKey(apiKey);
    if (!worker) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.workerId = worker.id;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};
