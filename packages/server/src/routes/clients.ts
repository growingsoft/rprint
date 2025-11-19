import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { authenticateClient, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateClient, requireAdmin, ClientController.getAllClients);
router.put('/:id/role', authenticateClient, requireAdmin, ClientController.updateClientRole);
router.delete('/:id', authenticateClient, requireAdmin, ClientController.deleteClient);

export default router;
