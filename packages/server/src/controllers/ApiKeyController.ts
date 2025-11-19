import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiKeyModel } from '../models/ApiKeyModel';

export class ApiKeyController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const apiKeys = await ApiKeyModel.findByClientId(clientId);

      // Don't return the actual key hashes
      const sanitizedKeys = apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
      }));

      res.json(sanitizedKeys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const { name, expiresInDays } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const { apiKey, plainKey } = await ApiKeyModel.create(
        clientId,
        name,
        expiresInDays || 0
      );

      // Return the plain key only once
      res.status(201).json({
        apiKey: plainKey,
        id: apiKey.id,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        message: 'Store this API key securely - it will not be shown again',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.clientId!;

      const deleted = await ApiKeyModel.delete(id, clientId);

      if (!deleted) {
        return res.status(404).json({ error: 'API key not found' });
      }

      res.json({ message: 'API key deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
