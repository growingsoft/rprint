import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ClientModel } from '../models/ClientModel';
import { WorkerModel } from '../models/WorkerModel';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, password, displayName, email } = req.body;

      if (!username || !password || !displayName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const existing = await ClientModel.findByUsername(username);
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const client = await ClientModel.create(username, password, displayName, email);

      const token = jwt.sign(
        { clientId: client.id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        client: {
          id: client.id,
          username: client.username,
          displayName: client.displayName,
          email: client.email,
          role: client.role
        },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
      }

      const client = await ClientModel.verifyPassword(username, password);
      if (!client) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { clientId: client.id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.json({
        client: {
          id: client.id,
          username: client.username,
          displayName: client.displayName,
          email: client.email,
          role: client.role
        },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async registerWorker(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Worker name is required' });
      }

      const worker = await WorkerModel.create(name);

      res.status(201).json({
        worker: {
          id: worker.id,
          name: worker.name,
          apiKey: worker.apiKey
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async me(req: any, res: Response) {
    try {
      const client = await ClientModel.findById(req.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json({
        client: {
          id: client.id,
          username: client.username,
          displayName: client.displayName,
          email: client.email,
          role: client.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
