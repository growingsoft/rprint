import { Response } from 'express';
import { ClientModel } from '../models/ClientModel';
import { AuthRequest } from '../middleware/auth';

export class ClientController {
  static async getAllClients(req: AuthRequest, res: Response) {
    try {
      const clients = await ClientModel.findAll();

      // Don't send password hashes
      const sanitized = clients.map(client => ({
        id: client.id,
        username: client.username,
        displayName: client.displayName,
        email: client.email,
        role: client.role,
        createdAt: client.createdAt
      }));

      res.json({ clients: sanitized });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateClientRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
      }

      await ClientModel.updateRole(id, role);
      res.json({ message: 'Role updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteClient(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if (id === req.clientId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await ClientModel.delete(id);
      res.json({ message: 'Client deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
