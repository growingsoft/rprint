import { Router } from 'express';
import { ApiKeyController } from '../controllers/ApiKeyController';
import { authenticateClient } from '../middleware/auth';

const router = Router();

router.get('/', authenticateClient, ApiKeyController.list);
router.post('/', authenticateClient, ApiKeyController.create);
router.delete('/:id', authenticateClient, ApiKeyController.delete);

export default router;
