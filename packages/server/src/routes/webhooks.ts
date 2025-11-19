import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { authenticateClient } from '../middleware/auth';

const router = Router();

router.get('/', authenticateClient, WebhookController.list);
router.post('/', authenticateClient, WebhookController.create);
router.get('/:id', authenticateClient, WebhookController.get);
router.put('/:id', authenticateClient, WebhookController.update);
router.delete('/:id', authenticateClient, WebhookController.delete);

export default router;
